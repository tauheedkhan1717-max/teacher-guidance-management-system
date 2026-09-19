import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { createTask, getGroupTasks, submitTask, verifyTaskSubmission, editTask } from "../controllers/taskController.js";

const router = Router();

router.use(authenticate);

router.post("/", authorize("TEACHER", "ADMIN"), createTask);
router.get("/group/:groupId", getGroupTasks);
router.post("/:taskId/submit", authorize("STUDENT"), submitTask);
router.put("/:taskId", authorize("TEACHER", "ADMIN"), editTask);
router.post("/:taskId/submissions/:studentId/verify", authorize("TEACHER", "ADMIN"), verifyTaskSubmission);

export const taskRouter = router;
