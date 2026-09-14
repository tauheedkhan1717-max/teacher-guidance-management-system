import { prisma } from "../lib/prisma.js";

// Generates a single-use 8-character teacher invite code
export async function createInvite(req, res, next) {
  try {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days valid

    const invite = await prisma.teacherInvite.create({
      data: {
        code,
        department: req.body.department || "General Teaching",
        createdById: req.user.userId, // This will come from our auth middleware
        expiresAt,
      },
    });

    res.status(201).json({ 
      message: "Invite generated.", 
      code: invite.code 
    });
  } catch (err) {
    next(err);
  }
}

// Lists all invites for the admin dashboard
export async function listInvites(req, res, next) {
  try {
    const invites = await prisma.teacherInvite.findMany({
      include: { 
        createdBy: { select: { name: true } }, 
        usedBy: { select: { name: true } } 
      },
    });
    res.json(invites);
  } catch (err) {
    next(err);
  }
}