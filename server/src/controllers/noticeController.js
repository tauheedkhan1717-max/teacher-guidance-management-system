// Notice board controller.
//   listNotices  — any authenticated role (read-only board).
//   createNotice — TEACHER/ADMIN (route gate); User + AuditLog written atomically.
//   deleteNotice — TEACHER/ADMIN (route gate); soft delete + audit; author-or-ADMIN
//                  ownership is enforced HERE, server-side, never by hiding UI.
import { prisma } from "../lib/prisma.js";

const noticeInclude = {
  author: { select: { id: true, name: true, role: true } },
};

export async function listNotices(req, res, next) {
  try {
    const notices = await prisma.notice.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      include: noticeInclude,
    });
    res.json({ notices });
  } catch (err) {
    next(err);
  }
}

export async function createNotice(req, res, next) {
  try {
    const { title, content } = req.validated;

    const notice = await prisma.$transaction(async (tx) => {
      const created = await tx.notice.create({
        data: { title, content, authorId: req.user.userId },
        include: noticeInclude,
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user.userId,
          action: "CREATED",
          entityType: "Notice",
          entityId: created.id,
          afterData: JSON.stringify(created),
        },
      });
      return created;
    });

    res.status(201).json({ message: "Notice posted.", notice });
  } catch (err) {
    next(err);
  }
}

export async function deleteNotice(req, res, next) {
  try {
    const existing = await prisma.notice.findFirst({
      where: { id: req.params.id, isDeleted: false },
    });
    if (!existing) {
      return res.status(404).json({ error: { message: "Notice not found." } });
    }

    // Identity-scope gate: a TEACHER may remove only their own notices; ADMIN any.
    if (req.user.role !== "ADMIN" && existing.authorId !== req.user.userId) {
      return res.status(403).json({
        error: { message: "Forbidden: you can only delete your own notices." },
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.notice.update({
        where: { id: existing.id },
        data: { isDeleted: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user.userId,
          action: "SOFT_DELETED",
          entityType: "Notice",
          entityId: existing.id,
          beforeData: JSON.stringify(existing),
        },
      });
    });

    res.json({ message: "Notice removed." });
  } catch (err) {
    next(err);
  }
}
