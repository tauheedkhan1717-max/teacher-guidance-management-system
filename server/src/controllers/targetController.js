import { prisma } from "../lib/prisma.js";

// POST /api/targets/:groupId — Upsert a target for a specific group and type (TEACHER only).
export async function setGroupTarget(req, res, next) {
  try {
    const { groupId } = req.params;
    const { type, totalTarget } = req.validated;

    // Verify teacher owns the group.
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: req.user.userId },
      select: { id: true },
    });
    if (!teacherProfile) {
      return res.status(403).json({ error: { message: "Teacher profile not found." } });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });
    
    if (!group || group.isDeleted) {
      return res.status(404).json({ error: { message: "Group not found." } });
    }
    
    if (group.teacherId !== teacherProfile.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: { message: "You do not own this group." } });
    }

    // Atomic: upsert GroupTarget + write AuditLog.
    const target = await prisma.$transaction(async (tx) => {
      const existing = await tx.groupTarget.findUnique({
        where: { groupId_type: { groupId, type } },
      });

      let updated;
      if (existing) {
        updated = await tx.groupTarget.update({
          where: { id: existing.id },
          data: { totalTarget },
        });
        await tx.auditLog.create({
          data: {
            actorId: req.user.userId,
            action: "UPDATED",
            entityType: "GroupTarget",
            entityId: existing.id,
            beforeData: JSON.stringify(existing),
            afterData: JSON.stringify(updated),
          },
        });
      } else {
        updated = await tx.groupTarget.create({
          data: { groupId, type, totalTarget },
        });
        await tx.auditLog.create({
          data: {
            actorId: req.user.userId,
            action: "CREATED",
            entityType: "GroupTarget",
            entityId: updated.id,
            afterData: JSON.stringify(updated),
          },
        });
      }
      return updated;
    });

    res.json({ target });
  } catch (err) {
    next(err);
  }
}

// GET /api/targets/:groupId — Get all targets for a group (TEACHER | STUDENT).
export async function getGroupTargets(req, res, next) {
  try {
    const { groupId } = req.params;
    // Basic verification that group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId, isDeleted: false },
    });
    if (!group) {
      return res.status(404).json({ error: { message: "Group not found." } });
    }

    const targets = await prisma.groupTarget.findMany({
      where: { groupId, isDeleted: false },
    });
    res.json({ targets });
  } catch (err) {
    next(err);
  }
}
