// Progress tracking — POST (create), GET /:studentId (timeline).
// POST requires TEACHER; the create runs inside a Prisma $transaction so the
// ProgressEntry and its AuditLog row commit (or roll back) atomically —
// an entry can never exist without its audit trail, and vice versa.
import { prisma } from "../lib/prisma.js";

// POST /api/progress — add a progress entry (TEACHER only).
export async function addProgress(req, res, next) {
  try {
    // Zod (validate middleware) already parsed + validated the body → req.validated.
    const { studentId, type, title, marksObtained, maxMarks, remark } = req.validated;

    // FK safety: the student must exist (don't rely on the DB error alone).
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      select: { id: true },
    });
    if (!student) {
      return res.status(400).json({ error: { message: "Student not found." } });
    }

    // Atomic: ProgressEntry + AuditLog, all or nothing.
    const entry = await prisma.$transaction(async (tx) => {
      const created = await tx.progressEntry.create({
        data: {
          studentId,
          type,
          title,
          marksObtained,
          maxMarks,
          remark: remark || undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: req.user.userId,
          action: "CREATED",
          entityType: "ProgressEntry",
          entityId: created.id,
          afterData: JSON.stringify(created),
        },
      });

      return created;
    });

    res.status(201).json({ entry });
  } catch (err) {
    next(err);
  }
}

// GET /api/progress/me — the signed-in student's own timeline (STUDENT only).
// Resolves the caller's StudentProfile from their user id, then returns the entries.
export async function getMyProgress(req, res, next) {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.userId },
      select: { id: true },
    });
    if (!profile) {
      return res.status(404).json({ error: { message: "Student profile not found." } });
    }
    const entries = await prisma.progressEntry.findMany({
      where: { studentId: profile.id, isDeleted: false },
      orderBy: { recordedAt: "desc" },
    });
    res.json({ entries });
  } catch (err) {
    next(err);
  }
}

// GET /api/progress/:studentId — the full (non-deleted) timeline for a student.
export async function getStudentProgress(req, res, next) {
  try {
    const entries = await prisma.progressEntry.findMany({
      where: { studentId: req.params.studentId, isDeleted: false },
      orderBy: { recordedAt: "desc" },
    });
    res.json({ entries });
  } catch (err) {
    next(err);
  }
}

// PUT /api/progress/:id — edit a progress entry (TEACHER only).
// Enforces group-access: the teacher must own a group the student belongs to.
export async function updateProgress(req, res, next) {
  try {
    const { id } = req.params;

    // Fetch the existing entry (must exist and not be soft-deleted).
    const existing = await prisma.progressEntry.findUnique({
      where: { id },
      include: { student: { select: { id: true } } },
    });
    if (!existing || existing.isDeleted) {
      return res.status(404).json({ error: { message: "Progress entry not found." } });
    }

    // Verify teacher has group access to this student.
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: req.user.userId },
      select: { id: true },
    });
    if (!teacherProfile) {
      return res.status(403).json({ error: { message: "Teacher profile not found." } });
    }
    const membership = await prisma.groupMember.findFirst({
      where: {
        studentId: existing.studentId,
        isDeleted: false,
        group: { teacherId: teacherProfile.id, isDeleted: false },
      },
    });
    if (!membership && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: { message: "You do not have access to this student." } });
    }

    // Build update data from validated (only present fields).
    const updateData = {};
    const { type, title, marksObtained, maxMarks, remark } = req.validated;
    if (type !== undefined) updateData.type = type;
    if (title !== undefined) updateData.title = title;
    if (marksObtained !== undefined) updateData.marksObtained = marksObtained;
    if (maxMarks !== undefined) updateData.maxMarks = maxMarks;
    if (remark !== undefined) updateData.remark = remark === "" ? null : remark;

    // Atomic: update ProgressEntry + write AuditLog.
    const updated = await prisma.$transaction(async (tx) => {
      const entry = await tx.progressEntry.update({
        where: { id },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          actorId: req.user.userId,
          action: "UPDATED",
          entityType: "ProgressEntry",
          entityId: id,
          beforeData: JSON.stringify(existing),
          afterData: JSON.stringify(entry),
        },
      });

      return entry;
    });

    res.json({ entry: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/progress/:id — soft-delete a progress entry (TEACHER only).
export async function deleteProgress(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.progressEntry.findUnique({
      where: { id },
    });
    if (!existing || existing.isDeleted) {
      return res.status(404).json({ error: { message: "Progress entry not found." } });
    }

    // Verify teacher has group access to this student.
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: req.user.userId },
      select: { id: true },
    });
    if (!teacherProfile) {
      return res.status(403).json({ error: { message: "Teacher profile not found." } });
    }
    const membership = await prisma.groupMember.findFirst({
      where: {
        studentId: existing.studentId,
        isDeleted: false,
        group: { teacherId: teacherProfile.id, isDeleted: false },
      },
    });
    if (!membership && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: { message: "You do not have access to this student." } });
    }

    // Atomic: soft-delete + AuditLog.
    await prisma.$transaction(async (tx) => {
      await tx.progressEntry.update({
        where: { id },
        data: { isDeleted: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: req.user.userId,
          action: "SOFT_DELETED",
          entityType: "ProgressEntry",
          entityId: id,
          beforeData: JSON.stringify(existing),
          afterData: JSON.stringify({ ...existing, isDeleted: true }),
        },
      });
    });

    res.json({ message: "Progress entry deleted." });
  } catch (err) {
    next(err);
  }
}
