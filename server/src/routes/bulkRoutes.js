// Teacher-side bulk operations outside the single-student progress flow.
//   POST /api/bulk/members       — add selected students into multiple target groups
//   POST /api/bulk/student-profile — narrow profile write (roll / year / phone) for selected students
//   GET  /api/bulk/my-memberships — student read alias (legacy path; prefer /api/students/me/memberships)
import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  bulkAddMembersSchema,
  bulkStudentProfileSchema,
} from "../schemas/index.js";
import { bulkAddMembers, bulkStudentProfile, listMyGroupMemberships } from "../controllers/bulkController.js";

const router = Router();

router.use(authenticate);

router.post(
  "/members",
  authorize("TEACHER", "ADMIN"),
  validate(bulkAddMembersSchema),
  bulkAddMembers
);

router.post(
  "/student-profile",
  authorize("TEACHER"),
  validate(bulkStudentProfileSchema),
  bulkStudentProfile
);

router.get("/my-memberships", authenticate, authorize("STUDENT"), listMyGroupMemberships);

export const bulkRouter = router;

import { csvBulkRegisterSchema, csvBulkProgressSchema, csvBulkAttendanceSchema } from "../schemas/csvSchemas.js";
import { csvRegisterStudents, csvAddProgress, csvAddAttendance } from "../controllers/csvBulkController.js";

router.post(
  "/csv/register-students",
  authorize("TEACHER", "ADMIN"),
  validate(csvBulkRegisterSchema),
  csvRegisterStudents
);

router.post(
  "/csv/progress",
  authorize("TEACHER", "ADMIN"),
  validate(csvBulkProgressSchema),
  csvAddProgress
);

router.post(
  "/csv/attendance",
  authorize("TEACHER", "ADMIN"),
  validate(csvBulkAttendanceSchema),
  csvAddAttendance
);
