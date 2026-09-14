// Access control that drives the WRITE scope: teachers may only write progress for
// subjects in their TeacherSubject join table. Mounted on routes that mutate progress.
//
//   requireSubjectAccess  — must be passed `subjectId` (from the request body or params).
//                          Resolves the teacher's profile, verifies the subject is
//                          assigned to them, and attaches req.teacherProfileId.
//
// Apply after `authenticate` + `authorize("TEACHER")`.
import { prisma } from "../lib/prisma.js";

export function requireSubjectAccess(getSubjectId) {
  return async (req, res, next) => {
    try {
      // The resolver may be sync or async (e.g. lookup an entry's subjectId first).
      const subjectId = await (typeof getSubjectId === "function" ? getSubjectId(req) : getSubjectId);

      if (!subjectId) {
        return res.status(400).json({ error: { message: "subjectId is required." } });
      }

      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: req.user.userId },
        select: { id: true },
      });
      if (!teacherProfile) {
        return res.status(403).json({ error: { message: "Teacher profile not found." } });
      }

      // The join table IS the write-permission source of truth.
      const assignment = await prisma.teacherSubject.findUnique({
        where: { teacherId_subjectId: { teacherId: teacherProfile.id, subjectId } },
        select: { id: true },
      });
      if (!assignment) {
        return res.status(403).json({
          error: { message: "You are not assigned to this subject." },
        });
      }

      req.teacherProfileId = teacherProfile.id;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

// Guards read access to a student's data:
//   TEACHER → can view ANY student (locked scope),
//   STUDENT → can only view their own profile/entries.
// Usage: requireStudentAccess() where `req.params.id` is the studentProfile id (or a resolver).
export function requireStudentAccess(studentIdResolver) {
  return async (req, res, next) => {
    try {
      const studentId = typeof studentIdResolver === "function" ? studentIdResolver(req) : studentIdResolver;
      if (!studentId) {
        return res.status(400).json({ error: { message: "studentId is required." } });
      }

      // Teacher: allow (teachers view every student).
      if (req.user.role === "TEACHER") return next();

      // Student: must match their own profile.
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: req.user.userId },
        select: { id: true },
      });
      if (!profile) {
        return res.status(403).json({ error: { message: "Student profile not found." } });
      }
      if (profile.id !== studentId) {
        return res.status(403).json({ error: { message: "Forbidden: cannot access another student's data." } });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}