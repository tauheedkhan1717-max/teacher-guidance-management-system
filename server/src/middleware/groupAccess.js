// Identity-scope gate for teacher write-scope: a teacher may only mutate data for
// students who are (active) members of one of THEIR groups. ADMIN bypasses — the
// admin is the system owner. The check reads the JWT (req.user), never client input,
// and re-queries the live membership table — server-side enforcement, not UI hiding.
//
// Mounted on write routes AFTER authenticate + authorize(...), BEFORE validate/controller.
import { prisma } from "../lib/prisma.js";

export async function requireGroupAccess(req, res, next) {
  try {
    if (req.user.role === "ADMIN") return next();

    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: req.user.userId },
      select: { id: true },
    });
    if (!teacherProfile) {
      return res.status(403).json({ error: { message: "Teacher profile not found." } });
    }

    const membership = await prisma.groupMember.findFirst({
      where: {
        isDeleted: false,
        studentId: req.body?.studentId,
        group: { teacherId: teacherProfile.id, isDeleted: false },
      },
      select: { id: true },
    });
    if (!membership) {
      return res.status(403).json({
        error: { message: "Forbidden: this student is not in one of your groups." },
      });
    }

    return next();
  } catch (err) {
    return next(err);
  }
}
