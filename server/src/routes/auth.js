// Auth routes — mounted at /api/auth.
//   POST /api/auth/login    → sets httpOnly cookie, returns user metadata
//   GET  /api/auth/me       → returns the authenticated user (requires cookie)
//   POST /api/auth/logout   → clears the cookie
//   POST /api/auth/register → STUDENT self-signup (auto-login)
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, registerSchema, registerTeacherSchema } from "../schemas/index.js";
import { login, me, logout, register, registerTeacher } from "../controllers/authController.js";

const router = Router();

router.post("/login", validate(loginSchema), login);
router.get("/me", authenticate, me);
router.post("/logout", logout);
router.post("/register", validate(registerSchema), register);
router.post("/register-teacher", validate(registerTeacherSchema), registerTeacher);

export const authRouter = router;