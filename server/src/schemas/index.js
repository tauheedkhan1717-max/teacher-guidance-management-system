// Zod validation schemas — single source of truth for request bodies (Phase 11).
// Every schema is `.strict()` so unexpected keys (e.g. a forged "role") are rejected.
import { z } from "zod";

// ---------- Auth ----------

export const loginSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(6),
  })
  .strict();

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email(),
    password: z.string().min(6),
    rollNumber: z.string().trim().min(1).max(30),
    // coerce: tolerant of the number the client sends, or a stringified value
    yearOfAdmission: z.coerce.number().int().min(1990).max(2100),
    phone: z.string().trim().max(20).optional().or(z.literal("")),
    // no "role" key — .strict() rejects anyone trying to self-promote to TEACHER
  })
  .strict();

// Teacher registration is invite-only (A1). An ADMIN issues a single-use code;
// the teacher redeems it here. Role is hard-coded server-side — never from the body.
export const registerTeacherSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email(),
    password: z.string().min(8).max(100),
    inviteCode: z.string().trim().min(1).max(40),
    department: z.string().trim().max(100).optional().or(z.literal("")),
  })
  .strict();

// ---------- Students ----------

// A2 (RESOLVED by user 2026-09): students may edit ONLY phone + address.
// Academic fields (rollNumber, classId, batch, yearOfAdmission) are rejected by .strict().
export const updateOwnContactSchema = z
  .object({
    phone: z.string().trim().max(20).optional().or(z.literal("")),
    address: z.string().trim().max(300).optional().or(z.literal("")),
  })
  .strict();

export const updateStudentByTeacherSchema = z
  .object({
    rollNumber: z.string().trim().max(30).optional(),
    batch: z.string().trim().max(20).optional(),
    yearOfAdmission: z.coerce.number().int().min(1990).max(2100).optional(),
    phone: z.string().trim().max(20).optional().or(z.literal("")),
    address: z.string().trim().max(300).optional().or(z.literal("")),
    classId: z.string().min(1).optional(),
  })
  .strict();

// ---------- Progress ----------

// Matches the ProgressType enum in prisma/schema.prisma.
export const PROGRESS_TYPES = ["UNIT_TEST", "MICRO_PROJECT", "END_SEM", "ASSIGNMENT"];

export const createProgressSchema = z
  .object({
    studentId: z.string().min(1),
    type: z.enum(PROGRESS_TYPES),
    title: z.string().trim().min(1).max(200),
    marksObtained: z.number().min(0).optional().or(z.literal(null)),
    maxMarks: z.number().min(0).optional().or(z.literal(null)),
    remark: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .strict();

// ---------- Notices ----------

// Notice board: any authenticated role may READ; only TEACHER/ADMIN may write (route gate).
export const createNoticeSchema = z
  .object({
    title: z.string().trim().min(3).max(150),
    content: z.string().trim().min(1).max(5000),
  })
  .strict();

// ---------- Guidance requests ----------

export const createRequestSchema = z
  .object({
    subjectId: z.string().min(1),
    topic: z.string().trim().min(1).max(200),
    details: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .strict();

export const respondRequestSchema = z
  .object({
    status: z.enum(["SCHEDULED", "COMPLETED"]),
    teacherReply: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .strict();