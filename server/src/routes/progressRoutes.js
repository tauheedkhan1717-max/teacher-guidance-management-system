// Progress routes.
//   POST   /api/progress              → TEACHER, only for students in their groups (requireGroupAccess)
//   POST   /api/progress/bulk         → TEACHER | ADMIN
//   GET    /api/progress/me           → STUDENT (own)
//   GET    /api/progress/:studentId   → TEACHER (any student) | STUDENT (own id only)
//   PUT    /api/progress/:id          → TEACHER (edit entry, group-access enforced in controller)
//   DELETE /api/progress/:id          → TEACHER (soft-delete, group-access enforced in controller)
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { requireGroupAccess } from "../middleware/groupAccess.js";
import { validate } from "../middleware/validate.js";
import { createProgressSchema, bulkAddProgressSchema, updateProgressSchema } from "../schemas/index.js";
import { addProgress, getMyProgress, getStudentProgress, updateProgress, deleteProgress } from "../controllers/progressController.js";
import { bulkAddProgress } from "../controllers/bulkController.js";

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

// Write-scope: the teacher must have the student in one of THEIR groups
// (requireGroupAccess re-checks live membership server-side; ADMIN bypasses).
// validate runs first so the gate reads a schema-parsed studentId.
router.post(
  "/",
  authorize("TEACHER"),
  validate(createProgressSchema),
  requireGroupAccess,
  addProgress
);

// Bulk add progress — one entry per selected student, same title/mark/remark.
// ADMIN bypasses the membership gate; teachers only write for in-group students.
router.post(
  "/bulk",
  authorize("TEACHER", "ADMIN"),
  validate(bulkAddProgressSchema),
  bulkAddProgress
);

// /me must be declared before /:studentId so it isn't swallowed as a param.
router.get("/me", authorize("STUDENT"), getMyProgress);

router.get(
  "/:studentId",
  authorize("TEACHER", "STUDENT"),
  studentOwnsRouteStudentId,
  getStudentProgress
);

// Edit and soft-delete — group-access is enforced inside the controller.
router.put(
  "/:id",
  authorize("TEACHER"),
  validate(updateProgressSchema),
  updateProgress
);

router.delete(
  "/:id",
  authorize("TEACHER"),
  deleteProgress
);

export const progressRouter = router;