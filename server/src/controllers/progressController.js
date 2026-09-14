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

