import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { recordAttendanceSchema } from "../schemas/index.js";
import { recordAttendance } from "../controllers/attendanceController.js";

const router = Router();
router.post("/", authenticate, authorize("TEACHER", "ADMIN"), validate(recordAttendanceSchema), recordAttendance);
export const attendanceRouter = router;

import { getStudentAttendance } from "../controllers/attendanceController.js";
router.get("/:studentId", authenticate, getStudentAttendance);
