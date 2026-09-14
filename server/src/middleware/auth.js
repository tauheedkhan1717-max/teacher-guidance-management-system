// Auth middleware: authenticate + authorize(...roles).
// requireSubjectAccess (TeacherSubject join table) arrives in Phase 5 with the progress routes.
import { verifyToken } from "../lib/jwt.js";

// Extracts the JWT, verifies its signature, and attaches req.user.
// Token source (in priority order): 1) httpOnly cookie, 2) Authorization: Bearer header.
export function authenticate(req, res, next) {
  const fromCookie = req.cookies?.token;
  const authHeader = req.headers.authorization ?? "";
  const fromHeader = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const token = fromCookie || fromHeader;
  if (!token) {
    return res.status(401).json({ error: { message: "Authentication required." } });
  }

  try {
    const payload = verifyToken(token);
    req.user = { userId: payload.userId, role: payload.role, name: payload.name };
    return next();
  } catch {
    return res.status(401).json({ error: { message: "Invalid or expired token." } });
  }
}

// Route guard: usage `authorize("TEACHER")` or `authorize("TEACHER", "STUDENT")`.
// Roles are case-sensitive and must match the Prisma enum (TEACHER | STUDENT).
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: { message: "Authentication required." } });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: { message: "Forbidden: insufficient role." } });
    }
    return next();
  };
}