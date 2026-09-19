import { prisma } from "../lib/prisma.js";

export async function recordAttendance(req, res, next) {
  try {
    const { studentId, date, isPresent } = req.validated;
    const parsedDate = new Date(date);

    const attendance = await prisma.attendance.upsert({
      where: { studentId_date: { studentId, date: parsedDate } },
      update: { isPresent },
      create: { studentId, date: parsedDate, isPresent }
    });
    
    await prisma.auditLog.create({
      data: {
        actorId: req.user.userId,
        action: "RECORDED_ATTENDANCE",
        entityType: "Attendance",
        entityId: attendance.id,
        afterData: JSON.stringify(attendance)
      }
    });

    res.status(201).json({ message: "Attendance recorded", attendance });
  } catch (err) {
    next(err);
  }
}

export async function getStudentAttendance(req, res, next) {
  try {
    const studentId = req.params.studentId;
    let actualStudentId = studentId;

    if (studentId === "me" && req.user.role === "STUDENT") {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: req.user.userId }
      });
      if (!profile) return res.status(404).json({ error: "Profile not found" });
      actualStudentId = profile.id;
    }

    // TODO: if teacher, verify they have access to this student.

    const records = await prisma.attendance.findMany({
      where: { studentId: actualStudentId, isDeleted: false },
      orderBy: { date: 'asc' }
    });
    
    res.json({ records });
  } catch (err) {
    next(err);
  }
}
