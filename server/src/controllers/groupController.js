// Group management controller — the teacher write-scope primitive.
//   listMyGroups   — TEACHER (own groups, with member counts) | ADMIN (all groups)
//   createGroup    — TEACHER creates a group they own (ADMIN creates one in their name)
//   deleteGroup    — owner or ADMIN only; soft delete
//   listMembers    — owner or ADMIN; active members with user info
//   addMember      — owner or ADMIN; FK-validates the student, tx + AuditLog
//   removeMember   — owner or ADMIN; soft-deletes the membership, tx + AuditLog
// All group writes are atomic ($transaction + AuditLog via the tx client).
import { prisma } from "../lib/prisma.js";

const groupCardSelect = {
  id: true,
  name: true,
  teacherId: true,
  createdAt: true,
  _count: { select: { members: { where: { isDeleted: false } } } },
};

function shapeGroup(g) {
  return { ...g, memberCount: g._count?.members ?? 0, _count: undefined };
}

async function resolveTeacherProfileId(userId) {
  const profile = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

export async function listMyGroups(req, res, next) {
  try {
    const where =
      req.user.role === "ADMIN"
        ? { isDeleted: false }
        : { isDeleted: false, teacherId: await resolveTeacherProfileId(req.user.userId) };

    const groups = await prisma.group.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: groupCardSelect,
    });
    res.json({ groups: groups.map(shapeGroup) });
  } catch (err) {
    next(err);
  }
}

export async function createGroup(req, res, next) {
  try {
    const { name } = req.validated;
    const teacherProfileId = await resolveTeacherProfileId(req.user.userId);
    if (!teacherProfileId) {
      return res.status(403).json({ error: { message: "Teacher profile not found." } });
    }

    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.group.create({
        data: {
          name,
          teacherId: teacherProfileId,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user.userId,
          action: "CREATED",
          entityType: "Group",
          entityId: created.id,
          afterData: JSON.stringify(created),
        },
      });
      return created;
    });

    res.status(201).json({ message: "Group created.", group });
  } catch (err) {
    next(err);
  }
}

// Loads the group and enforces owner-or-ADMIN. Responds 404/403 and returns null
// when access fails; the caller just checks for null.
async function loadOwnedGroup(req, res) {
  const group = await prisma.group.findFirst({
    where: { id: req.params.id, isDeleted: false },
  });
  if (!group) {
    res.status(404).json({ error: { message: "Group not found." } });
    return null;
  }
  if (req.user.role !== "ADMIN" && group.teacherId !== (await resolveTeacherProfileId(req.user.userId))) {
    res.status(403).json({ error: { message: "Forbidden: this group belongs to another teacher." } });
    return null;
  }
  return group;
}

export async function deleteGroup(req, res, next) {
  try {
    const group = await loadOwnedGroup(req, res);
    if (!group) return;

    await prisma.$transaction(async (tx) => {
      await tx.group.update({ where: { id: group.id }, data: { isDeleted: true } });
      await tx.auditLog.create({
        data: {
          actorId: req.user.userId,
          action: "SOFT_DELETED",
          entityType: "Group",
          entityId: group.id,
          beforeData: JSON.stringify(group),
        },
      });
    });

    res.json({ message: "Group removed." });
  } catch (err) {
    next(err);
  }
}

export async function listMembers(req, res, next) {
  try {
    const group = await loadOwnedGroup(req, res);
    if (!group) return;

    const memberships = await prisma.groupMember.findMany({
      where: { groupId: group.id, isDeleted: false },
      orderBy: { createdAt: "asc" },
      include: {
        student: {
          select: {
            id: true,
            rollNumber: true,
            yearOfAdmission: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    res.json({
      members: memberships.map((m) => ({
        membershipId: m.id,
        addedAt: m.createdAt,
        student: m.student,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function addMember(req, res, next) {
  try {
    const group = await loadOwnedGroup(req, res);
    if (!group) return;

    const { studentId } = req.validated;

    // FK pre-check with a readable 400 (mirrors addProgress's style).
    const student = await prisma.studentProfile.findFirst({
      where: { id: studentId, isDeleted: false },
      select: { id: true, rollNumber: true },
    });
    if (!student) {
      return res.status(400).json({ error: { message: "Student not found." } });
    }

    // The @@unique([groupId, studentId]) constraint means a soft-deleted membership
    // still occupies the pair — so re-adding RESTORES the row instead of creating one.
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.groupMember.findFirst({
        where: { groupId: group.id, studentId },
        select: { id: true, isDeleted: true },
      });
      if (existing && existing.isDeleted === false) return { conflict: true };

      if (existing) {
        const restored = await tx.groupMember.update({
          where: { id: existing.id },
          data: { isDeleted: false },
          include: {
            student: {
              select: {
                id: true,
                rollNumber: true,
                user: { select: { name: true } },
              },
            },
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: req.user.userId,
            action: "RESTORED",
            entityType: "GroupMember",
            entityId: restored.id,
            afterData: JSON.stringify(restored),
          },
        });
        return { conflict: false, restored: true, member: restored };
      }

      const created = await tx.groupMember.create({
        data: { groupId: group.id, studentId },
        include: {
          student: {
            select: {
              id: true,
              rollNumber: true,
              user: { select: { name: true } },
            },
          },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user.userId,
          action: "CREATED",
          entityType: "GroupMember",
          entityId: created.id,
          afterData: JSON.stringify(created),
        },
      });
      return { conflict: false, restored: false, member: created };
    });

    if (result.conflict) {
      return res.status(409).json({
        error: { message: "This student is already a member of the group." },
      });
    }

    res.status(result.restored ? 200 : 201).json({
      message: `Added ${result.member.student.user.name} (${result.member.student.rollNumber}).`,
      member: result.member,
    });
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req, res, next) {
  try {
    const group = await loadOwnedGroup(req, res);
    if (!group) return;

    const membership = await prisma.groupMember.findFirst({
      where: { id: req.params.memberId, groupId: group.id, isDeleted: false },
    });
    if (!membership) {
      return res.status(404).json({ error: { message: "Membership not found." } });
    }

    await prisma.$transaction(async (tx) => {
      await tx.groupMember.update({
        where: { id: membership.id },
        data: { isDeleted: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user.userId,
          action: "SOFT_DELETED",
          entityType: "GroupMember",
          entityId: membership.id,
          beforeData: JSON.stringify(membership),
        },
      });
    });

    res.json({ message: "Student removed from the group." });
  } catch (err) {
    next(err);
  }
}
