// Student routes — minimal directory powering the Teacher Dashboard.
//   GET /api/students → TEACHER | ADMIN (all active students)
import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { getAllStudents } from "../controllers/studentController.js";

const router = Router();

router.get("/", authenticate, authorize("TEACHER", "ADMIN"), getAllStudents);

export const studentRouter = router;