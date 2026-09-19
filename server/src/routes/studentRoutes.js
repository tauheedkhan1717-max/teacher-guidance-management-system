// Student routes — directory powering the Teacher Dashboard + student self-service.
//   GET    /api/students              → TEACHER | ADMIN (all active students)
//   GET    /api/students/me/memberships → STUDENT (their groups + guide teachers)
//   PATCH  /api/students/me           → STUDENT (update own phone)
//   DELETE /api/students/:id          → TEACHER | ADMIN (soft-delete student)
import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { getAllStudents, updateMe, deleteStudent } from "../controllers/studentController.js";
import { listMyGroupMemberships } from "../controllers/bulkController.js";
import { validate } from "../middleware/validate.js";
import { updatePhoneSchema } from "../schemas/index.js";

const router = Router();

router.get("/", authenticate, authorize("TEACHER", "ADMIN"), getAllStudents);

router.get(
  "/me/memberships",
  authenticate,
  authorize("STUDENT"),
  listMyGroupMemberships
);

router.patch(
  "/me",
  authenticate,
  authorize("STUDENT"),
  validate(updatePhoneSchema),
  updateMe
);

router.delete(
  "/:id",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  deleteStudent
);

export const studentRouter = router;