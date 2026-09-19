import { z } from "zod";
import { PROGRESS_TYPES } from "./index.js";

// Schemas for CSV bulk uploads. The frontend parses the CSV into these JSON arrays.

export const csvBulkRegisterSchema = z.array(
  z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email(),
    password: z.string().min(6),
    rollNumber: z.string().trim().min(1).max(30),
    yearOfAdmission: z.coerce.number().int().min(1990).max(2100),
    phone: z.string().trim().max(20).optional().or(z.literal("")),
  }).strict()
).min(1).max(1000);

export const csvBulkProgressSchema = z.array(
  z.object({
    rollNumber: z.string().trim().min(1),
    type: z.enum(PROGRESS_TYPES),
    title: z.string().trim().min(1).max(200),
    marksObtained: z.coerce.number().min(0).optional().or(z.literal(null)),
    maxMarks: z.coerce.number().min(0).optional().or(z.literal(null)),
    remark: z.string().trim().max(500).optional().or(z.literal("")),
  }).strict()
).min(1).max(1000);

export const csvBulkEnrollSchema = z.array(
  z.object({
    rollNumber: z.string().trim().min(1),
    groupId: z.string().trim().min(1)
  }).strict()
).min(1).max(1000);

export const csvBulkAttendanceSchema = z.array(
  z.object({
    rollNumber: z.string().trim().min(1),
    date: z.string().datetime(),
    isPresent: z.boolean()
  }).strict()
).min(1).max(1000);
