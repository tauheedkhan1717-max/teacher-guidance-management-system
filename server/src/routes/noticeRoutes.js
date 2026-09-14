// Notice board routes.
//   GET    /api/notices     → any authenticated role (students read too)
//   POST   /api/notices     → TEACHER, ADMIN (Zod validate)
//   DELETE /api/notices/:id → TEACHER, ADMIN (author-or-admin gate lives in the controller)
import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createNoticeSchema } from "../schemas/index.js";
import {
  listNotices,
  createNotice,
  deleteNotice,
} from "../controllers/noticeController.js";

const router = Router();

router.use(authenticate);

router.get("/", listNotices);

router.post(
  "/",
  authorize("TEACHER", "ADMIN"),
  validate(createNoticeSchema),
  createNotice
);

router.delete("/:id", authorize("TEACHER", "ADMIN"), deleteNotice);

export const noticeRouter = router;
