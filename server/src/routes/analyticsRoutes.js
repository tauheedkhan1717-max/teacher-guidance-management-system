import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { getStudentAnalytics } from "../controllers/analyticsController.js";

const router = Router();
router.get("/:studentId", authenticate, authorize("STUDENT", "TEACHER", "ADMIN"), getStudentAnalytics);
export const analyticsRouter = router;
