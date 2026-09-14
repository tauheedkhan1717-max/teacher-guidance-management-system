// Progress routes.
//   POST /api/progress          → TEACHER (Zod validate → addProgress)
//   GET  /api/progress/:studentId → TEACHER (any student) | STUDENT (own id only)
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createProgressSchema } from "../schemas/index.js";
import { addProgress, getMyProgress, getStudentProgress } from "../controllers/progressController.js";

const router = Router();

router.use(authenticate);

// Students may only read their OWN progress — enforced server-side, not by hiding UI.
async function studentOwnsRouteStudentId(req, res, next) {
  if (req.user.role === "TEACHER") return next();
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.userId },
      select: { id: true },
    });
    if (!profile || profile.id !== req.params.studentId) {
      return res.status(403).json({
        error: { message: "Forbidden: you can only view your own progress." },
      });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

router.post("/", authorize("TEACHER"), validate(createProgressSchema), addProgress);

// /me must be declared before /:studentId so it isn't swallowed as a param.
router.get("/me", authorize("STUDENT"), getMyProgress);

router.get(
  "/:studentId",
  authorize("TEACHER", "STUDENT"),
  studentOwnsRouteStudentId,
  getStudentProgress
);

export const progressRouter = router;