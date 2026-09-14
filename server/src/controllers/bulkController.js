// Teacher-side bulk operations — one mutation, many students, atomic + audited.
// Every bulk op writes inside one interactive transaction so partial failures roll back
// cleanly, and every affected domain row gets its own AuditLog row (plural snapshots for
// the bulk op). ADMIN bypasses the group-membership gate on progress; a teacher writes
// progress only for students in THEIR groups (enforced by requireGroupAccess which already
// runs on the single progress route — here we re-check per student inside the transaction
// for clarity and so each student can fail independently without aborting the whole batch).
import { prisma } from "../lib/prisma.js";

export async function bulkAddProgress(req, res, next) {
  try {
    const { studentIds, type, title, marksObtained, maxMarks, remark } = req.validated;

    // Validate students exist first (fail fast with a friendly 400 per the project's style).
    const existing = await prisma.studentProfile.findMany({
      where: { id: { in: studentIds }, isDeleted: false },
      select: { id: true, rollNumber: true },
    });
    const existingById = new Map(existing.map((s) => [s.id, s]));
    const missing = studentIds.filter((id) => !existingById.has(id));
    if (missing.length) {
      return res.status(400).json({
        error: { message: `Students not found: ${missing.length ? missing.join(", ") : "—"}.` },
      });
    }

    const created = [];
    await prisma.$transaction(
      studentIds.map((studentId) =>
        (async (tx) => {
          // Teacher write-scope: only in the teacher's own groups.
          const teacherProfileId = req.user.role === "ADMIN"
            ? null
            : (await tx.teacherProfile.findUnique({ where: { userId: req.user.userId }, select: { id: true } }))?.id;
          const inGroup =
            req.user.role === "ADMIN" ||
            ((await tx.groupMember.findFirst({
              where: {
                studentId,
                isDeleted: false,
                group: { teacherId: teacherProfileId, isDeleted: false },
              },
              select: { id: true },
            }))?.id) !== undefined;

          if (!inGroup) {
            return { studentId, ok: false, reason: "not_in_teacher_group" };
          }

          const entry = await tx.progressEntry.create({
            data: { studentId, type, title, marksObtained, maxMarks, remark },
          });
          await tx.auditLog.create({
            data: {
              actorId: req.user.userId,
              action: "CREATED",
              entityType: "ProgressEntry",
              entityId: entry.id,
              afterData: JSON.stringify(entry),
            },
          });
          return { studentId, ok: true, entry };
        })
      )
    );

    const successIds = created.filter(Boolean).map((r) => r.studentId);
    const failed = created.filter((r) => !r.ok);

    res.status(201).json({
      message: `Recorded progress for ${studentIds.length} student(s).`,
      recorded: created.filter(Boolean).map((r) => ({ studentId: r.studentId })),
      failed: failed.map((r) => ({ studentId: r.studentId, reason: r.reason })),
    });
  } catch (err) {
    next(err);
  }
}

export async function bulkAddMembers(req, res, next) {
  try {
    const { studentIds, groupIds } = req.validated;

    // Teacher owning each target group is verified here (owner-or-ADMIN covers admin).
    const targetGroups = await prisma.group.findMany({
      where: { id: { in: groupIds }, isDeleted: false },
      include: { teacher: { select: { userId: true, id: true } } },
      select: { id: true, teacher: { select: { userId: true, id: true } } },
    });
    const nonexistent = groupIds.filter(
      (id) => !targetGroups.some((g) => g.id === id)
    );
    if (nonexistent.length) {
      return res.status(400).json({
        error: { message: `Groups not found: ${nonexistent.join(", ") || "—"}.` },
      });
    }

    // Ownership: a teacher may only enroll into their own groups; ADMIN any.
    const unowned = targetGroups
      .filter((g) => req.user.role !== "ADMIN" && g.teacher.userId !== req.user.userId)
      .map((g) => g.id);
    if (unowned.length) {
      return res.status(403).json({
        error: { message: "You do not own one or more of the target groups." },
      });
    }

    // Student existence pre-check.
    const existingStudents = await prisma.studentProfile.findMany({
      where: { id: { in: studentIds }, isDeleted: false },
      select: { id: true, rollNumber: true },
    });
    const studentById = new Map(existingStudents.map((s) => [s.id, s]));
    const missingStudents = studentIds.filter((id) => !studentById.has(id));
    if (missingStudents.length) {
      return res.status(400).json({
        error: { message: `Students not found: ${missingStudents.join(", ") || "—"}.` },
      });
    }

    const results = await prisma.$transaction(        studentIds.flatMap((studentId) =>
        groupIds.map((groupId) =>
          (async (tx) => {
            const existing = await tx.groupMember.findFirst({
              where: { groupId, studentId, isDeleted: false },
              select: { id: true },
            });
            if (existing) return { studentId, groupId, status: "already_member" };

            const member = await tx.groupMember.create({
              data: { groupId, studentId },
            });
            await tx.auditLog.create({
              data: {
                actorId: req.user.userId,
                action: "CREATED",
                entityType: "GroupMember",
                entityId: member.id,
                afterData: JSON.stringify(member),
              },
            });
            return { studentId, groupId, status: "added", memberId: member.id };
          })
        )
      )
    );

    const added = results.filter((r) => r.status === "added");
    const already = results.filter((r) => r.status === "already_member");

    res.status(201).json({
      message: `Enrolled ${added.length} student(s) across ${groupIds.length} group(s).`,
      added: added.map((r) => ({ studentId: r.studentId, groupId: r.groupId })),
      already: already.map((r) => ({ studentId: r.studentId, groupId: r.groupId })),
    });
  } catch (err) {
    next(err);
  }
}

export async function bulkStudentProfile(req, res, next) {
  try {
    const { studentIds, rollNumber, yearOfAdmission, phone } = req.validated;

    // Teacher may only edit profiles for students in their groups (same write-scope as progress).
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: req.user.userId },
      select: { id: true },
    });
    if (!teacherProfile) {
      return res.status(403).json({ error: { message: "Teacher profile not found." } });
    }

    const existing = await prisma.studentProfile.findMany({
      where: { id: { in: studentIds }, isDeleted: false },
      select: { id: true, rollNumber: true },
    });
    const existingById = new Map(existing.map((s) => [s.id, s]));
    const missing = studentIds.filter((id) => !existingById.has(id));
    if (missing.length) {
      return res.status(400).json({
        error: { message: `Students not found: ${missing.length ? missing.join(", ") : "—"}.` },
      });
    }

    // Ownership check on the whole batch before writing (consistent with the single-path gate).
    const unauthorized = await Promise.all(
      studentIds.map(async (id) => {
        if (req.user.role === "ADMIN") return false;
        const has = await prisma.groupMember.findFirst({
          where: { studentId: id, isDeleted: false, group: { teacherId: teacherProfile.id, isDeleted: false } },
          select: { id: true },
        });
        return !has;
      })
    );
    const unauthorizedIds = studentIds.filter((_, i) => unauthorized[i]);
    if (unauthorized.length) {
      return res.status(403).json({
        error: {
          message: `Cannot edit profiles for ${unauthorized.length} student(s) not in your groups.`,
        },
      });
    }

    // Roll number global uniqueness inside this batch (avoid P2002 mid-transaction with an ugly failure).
    const rollConflicts = [];
    const groupRolls = new Map();
    for (const id of studentIds) {
      const s = existingById.get(id);
      if (s) groupRolls.set(s.rollNumber, (groupRolls.get(s.rollNumber) || 0) + 1);
    }
    if (rollNumber && (groupRolls.get(rollNumber) ?? 1) > 1 && rollNumber !== "") {
      // If a single new roll is shared among multiple targeted rows, that's a conflict only if
      // another live row outside this batch already uses it — handled by unique constraint below.
    }

    const changes = await prisma.$transaction(
      studentIds.map((id) =>
        prisma.$transaction(async (tx) => {
          const before = await tx.studentProfile.findUnique({ where: { id }, select: { id: true, rollNumber: true, yearOfAdmission: true, phone: true } });
          const updated = await tx.studentProfile.update({
            where: { id },
            data: {
              ...(rollNumber !== undefined && { rollNumber: rollNumber || undefined }),
              ...(yearOfAdmission !== undefined && { yearOfAdmission }),
              ...(phone !== undefined && { phone: phone === "" ? null : phone }),
            },
          });
          await tx.auditLog.create({
            data: {
              actorId: req.user.userId,
              action: "UPDATED",
              entityType: "StudentProfile",
              entityId: id,
              beforeData: JSON.stringify(before),
              afterData: JSON.stringify(updated),
            },
          });
          return { id, ok: true };
        })
      )
    );


    res.json({
      message: `Updated ${studentIds.length} student profile(s).`,
      updated: changes.map((r) => r.id),
    });
  } catch (err) {
    next(err);
  }
}

// Student read: their academic groups + guide teachers (read-only, any authenticated role).
export async function listMyGroupMemberships(req, res, next) {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.userId },
      select: { id: true },
    });
    if (!profile) {
      return res.status(404).json({ error: { message: "Student profile not found." } });
    }

    const memberships = await prisma.groupMember.findMany({
      where: { studentId: profile.id, isDeleted: false },
      orderBy: { createdAt: "asc" },
      include: {
        group: {
          where: { isDeleted: false },
          include: {
            teacher: {
              include: { user: { select: { name: true, email: true } } },
            },
          },
        },
      },
    });

    res.json({
      memberships: memberships.map((m) => ({
        membershipId: m.id,
        addedAt: m.createdAt,
        group: {
          id: m.group.id,
          name: m.group.name,
          teacher: m.group.teacher.user,
        },
      })),
    });
  } catch (err) {
    next(err);
  }
}
