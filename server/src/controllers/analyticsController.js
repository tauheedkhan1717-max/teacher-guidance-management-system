import { prisma } from "../lib/prisma.js";

export async function getStudentAnalytics(req, res, next) {
  try {
    let studentId = req.params.studentId;
    if (studentId === "me") {
      const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user.userId } });
      if (!profile) return res.status(404).json({ error: { message: "Profile not found." } });
      studentId = profile.id;
    }

    const entries = await prisma.progressEntry.findMany({
      where: { studentId, isDeleted: false },
      orderBy: { recordedAt: 'asc' }
    });

    const attendances = await prisma.attendance.findMany({
      where: { studentId, isDeleted: false }
    });

    const totalClasses = attendances.length;
    const presentClasses = attendances.filter(a => a.isPresent).length;
    const attendancePercentage = totalClasses === 0 ? 0 : (presentClasses / totalClasses) * 100;

    const chartData = entries.filter(e => e.marksObtained != null && e.maxMarks != null).map(e => ({
      title: e.title,
      percentage: (e.marksObtained / e.maxMarks) * 100,
      recordedAt: e.recordedAt
    }));

    // Find student's active group to fetch targets
    const membership = await prisma.groupMember.findFirst({
      where: { studentId, isDeleted: false },
      include: { group: { include: { targets: { where: { isDeleted: false } } } } }
    });

    const byType = {};
    if (membership && membership.group) {
      const targets = membership.group.targets;
      const typeList = ["UNIT_TEST", "MICRO_PROJECT", "END_SEM", "ASSIGNMENT"];
      
      for (const type of typeList) {
        const completed = entries.filter(e => e.type === type).length;
        const targetObj = targets.find(t => t.type === type);
        const target = targetObj ? targetObj.totalTarget : 0;
        
        if (target > 0 || completed > 0) {
          byType[type] = { completed, target };
        }
      }
    }

    res.json({
      analytics: {
        totalEntries: entries.length,
        attendancePercentage,
        chartData,
        byType
      }
    });
  } catch (err) {
    next(err);
  }
}
