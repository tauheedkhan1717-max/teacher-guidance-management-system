import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { setGroupTargetSchema } from "../schemas/index.js";
import { setGroupTarget, getGroupTargets } from "../controllers/targetController.js";

const router = Router();

router.use(authenticate);

// Upsert target
router.post(
  "/:groupId",
  authorize("TEACHER", "ADMIN"),
  validate(setGroupTargetSchema),
  setGroupTarget
);

// Get targets
router.get(
  "/:groupId",
  authorize("TEACHER", "STUDENT", "ADMIN"),
  getGroupTargets
);

export const targetRouter = router;
