// Rate limiting (express-rate-limit) — guards against brute-force login attempts
// and generic request flooding. Applied in app.js:
//   app.use("/api", apiLimiter)      — global cap
//   app.use("/api/auth", authLimiter) — tighter cap on auth endpoints
import rateLimit from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 300, // 300 requests per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many requests. Please try again later." } },
});

export const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 100, // 100 login/register attempts per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many login attempts. Please wait 15 minutes." } },
});