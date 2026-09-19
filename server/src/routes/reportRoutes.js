import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { getStudentReport } from "../controllers/reportController.js";

const router = Router();
router.get("/:studentId", authenticate, authorize("STUDENT", "TEACHER", "ADMIN"), getStudentReport);
export const reportRouter = router;
