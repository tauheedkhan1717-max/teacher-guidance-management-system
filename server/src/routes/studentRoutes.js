// Student routes — minimal directory powering the Teacher Dashboard.
//   GET /api/students        → TEACHER | ADMIN (all active students)
//   GET /api/students/me/memberships → STUDENT (their groups + guide teachers)
import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { getAllStudents } from "../controllers/studentController.js";
import { listMyGroupMemberships } from "../controllers/bulkController.js";

const router = Router();

router.get("/", authenticate, authorize("TEACHER", "ADMIN"), getAllStudents);

router.get(
  "/me/memberships",
  authenticate,
  authorize("STUDENT"),
  listMyGroupMemberships
);

export const studentRouter = router;