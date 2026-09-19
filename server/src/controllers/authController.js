// Authentication controller: login, me, logout.
// Login verifies credentials with bcrypt, then signs a JWT and sets it in an httpOnly cookie.
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";

const COOKIE_NAME = "token";
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

function cookieOptions() {
  const opts = {
    httpOnly: true,   // browser JavaScript cannot read the token → XSS cannot steal it
    secure: process.env.NODE_ENV === "production", // HTTPS-only in production
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    // Production: SPA (Vercel) and API (Render) are cross-site, so SameSite=None+Secure
    // is required for the cookie to travel. Dev is same-site (localhost), so Lax is safer.
    path: "/",
    maxAge: COOKIE_MAX_AGE_MS,
  };
  // Optional: scope the cookie to a specific domain when deploying to a custom domain.
  if (process.env.COOKIE_DOMAIN) opts.domain = process.env.COOKIE_DOMAIN;
  return opts;
}

export async function login(req, res) {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return res.status(400).json({ error: { message: "Email and password are required." } });
  }

  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    // Same message for "no such user" and "wrong password" — don't reveal which.
    return res.status(401).json({ error: { message: "Invalid email or password." } });
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    return res.status(401).json({ error: { message: "Invalid email or password." } });
  }

  const token = signToken({ userId: user.id, role: user.role, name: user.name });
  res.cookie(COOKIE_NAME, token, cookieOptions());

  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

export async function me(req, res) {
  // `authenticate` already verified the token; fetch the live user record.
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!user) {
    return res.status(404).json({ error: { message: "User not found." } });
  }
  res.json({ user });
}

export async function logout(req, res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.json({ message: "Logged out successfully." });
}

// Student self-registration.
// SECURITY: role is hard-coded to "STUDENT" — a caller can never pass a role.
// Teachers are only created by the seed script / an existing teacher (Phase-5 rule A1).
export async function register(req, res, next) {
  // Zod (validate middleware) already parsed and validated req.body. Its result lives in
  // req.validated — every field is the correct type (yearOfAdmission is a number via z.coerce).
  // Trusting Zod here instead of re-checking means one source of truth, no duplicate logic.
  const { name, email, password, rollNumber, yearOfAdmission, phone } = req.validated;

  const passwordHash = await bcrypt.hash(password, 10);

  // Atomic: User + StudentProfile + an audit entry, all or nothing.
  // Duplicate email/rollNumber raises P2002 → handled by the centralized error handler (409).
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        name: name.trim(),
        role: "STUDENT",
        studentProfile: {
          create: {
            rollNumber: rollNumber.trim(),
            yearOfAdmission,
            phone: phone?.trim() || undefined,
          },
        },
      },
      select: { id: true, name: true, email: true, role: true },
    });
    // Audit row written directly against the new schema (beforeData/afterData TEXT columns).
    await tx.auditLog.create({
      data: {
        actorId: created.id,
        action: "STUDENT_REGISTER",
        entityType: "User",
        entityId: created.id,
        afterData: JSON.stringify({ id: created.id, email: created.email, role: "STUDENT" }),
      },
    });
    return created;
  });

  // Auto-login after registration: same httpOnly cookie as login.
  const token = signToken({ userId: user.id, role: user.role, name: user.name });
  res.cookie(COOKIE_NAME, token, cookieOptions());

  res.status(201).json({ user });
}

// Teacher registration — invite-only (A1, locked).
// An ADMIN issues a single-use TeacherInvite (POST /api/admin/invites); the teacher
// redeems it here. Role is ALWAYS "TEACHER" — never accepted from the request body.
export async function registerTeacher(req, res, next) {
  // Zod middleware already parsed + validated the body; the result is in req.validated.
  const { name, email, password, inviteCode } = req.validated;

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedCode = inviteCode.trim();

  try {
    // 1) Invite must exist, be unused, and not expired.
    const invite = await prisma.teacherInvite.findUnique({ where: { code: trimmedCode } });
    if (!invite || invite.isUsed) {
      return res.status(400).json({ error: { message: "Invalid or already-used invite code." } });
    }
    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ error: { message: "Invite code has expired." } });
    }

    // 2) No duplicate email (respond 409 so the client can distinguish it).
    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existing) {
      return res.status(409).json({ error: { message: "Email is already registered." } });
    }

    // 3) Create User + TeacherProfile + mark invite used + audit row — atomic, all or nothing.
    const passwordHash = await bcrypt.hash(password, 10);

    const teacher = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: trimmedEmail,
          passwordHash,
          name: name.trim(),
          role: "TEACHER",
          teacherProfile: {
            create: {
              // Unique employeeId — derive a short suffix so EMP- code cannot collide.
              employeeId: `EMP-${trimmedCode.replace(/[^A-Z0-9]/gi, "").slice(0, 5).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
              department: invite.department,
            },
          },
        },
        select: { id: true, name: true, email: true, role: true },
      });

      await tx.teacherInvite.update({
        where: { id: invite.id },
        data: { isUsed: true, usedById: created.id },
      });

      // Audit row written directly against the new schema (beforeData/afterData TEXT columns).
      await tx.auditLog.create({
        data: {
          actorId: created.id,
          action: "TEACHER_REGISTER",
          entityType: "User",
          entityId: created.id,
          afterData: JSON.stringify({ id: created.id, email: created.email, role: "TEACHER" }),
        },
      });

      return created;
    });

    // 4) No auto-login for teachers — they must sign in after account creation.
    res.status(201).json({
      message: "Teacher account created. You can now log in.",
      user: teacher,
    });
  } catch (err) {
    next(err);
  }
}