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