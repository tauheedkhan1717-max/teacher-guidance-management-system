// Student list API — minimal, scoped to the Progress Tracking MVP.
import { prisma } from "../lib/prisma.js";

// GET /api/students — all active students (TEACHER/ADMIN only).
export async function getAllStudents(req, res, next) {
  try {
    const students = await prisma.studentProfile.findMany({
      where: { isDeleted: false },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { rollNumber: "asc" },
    });
    res.json({ students });
  } catch (err) {
    next(err);
  }
}
// PATCH /api/students/me
export async function updateMe(req, res, next) {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.userId }
    });
    if (!profile) return res.status(404).json({ error: { message: "Profile not found." } });

    const { phone } = req.validated;
    const updated = await prisma.studentProfile.update({
      where: { id: profile.id },
      data: { phone }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.userId,
        action: "UPDATED_PROFILE",
        entityType: "StudentProfile",
        entityId: profile.id,
        beforeData: JSON.stringify(profile),
        afterData: JSON.stringify(updated)
      }
    });

    res.json({ message: "Profile updated successfully.", student: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/students/:id — soft-delete a student profile (TEACHER/ADMIN).
// Cascading: also soft-deletes all GroupMember rows for this student.
export async function deleteStudent(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.studentProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!existing || existing.isDeleted) {
      return res.status(404).json({ error: { message: "Student not found." } });
    }

    // If TEACHER (not ADMIN), verify the student is in one of their groups.
    if (req.user.role === "TEACHER") {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: req.user.userId },
        select: { id: true },
      });
      if (!teacherProfile) {
        return res.status(403).json({ error: { message: "Teacher profile not found." } });
      }
      const membership = await prisma.groupMember.findFirst({
        where: {
          studentId: id,
          isDeleted: false,
          group: { teacherId: teacherProfile.id, isDeleted: false },
        },
      });
      if (!membership) {
        return res.status(403).json({ error: { message: "You do not have access to this student." } });
      }
    }

    // Atomic: soft-delete student + cascade memberships + AuditLog.
    await prisma.$transaction(async (tx) => {
      // Soft-delete all active memberships.
      await tx.groupMember.updateMany({
        where: { studentId: id, isDeleted: false },
        data: { isDeleted: true },
      });

      // Soft-delete the student profile itself.
      await tx.studentProfile.update({
        where: { id },
        data: { isDeleted: true },
      });

      // Soft-delete the user account too so they can't log in.
      await tx.user.update({
        where: { id: existing.userId },
        data: { isDeleted: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: req.user.userId,
          action: "SOFT_DELETED",
          entityType: "StudentProfile",
          entityId: id,
          beforeData: JSON.stringify(existing),
          afterData: JSON.stringify({ ...existing, isDeleted: true }),
        },
      });
    });

    res.json({ message: "Student removed successfully." });
  } catch (err) {
    next(err);
  }
}
