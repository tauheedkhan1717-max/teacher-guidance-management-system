// Express app factory — wires middleware, routes, and error handlers in order.
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { progressRouter } from "./routes/progressRoutes.js";
import { studentRouter } from "./routes/studentRoutes.js";
import { noticeRouter } from "./routes/noticeRoutes.js";
import { groupRouter } from "./routes/groupRoutes.js";
import { bulkRouter } from "./routes/bulkRoutes.js";
import { analyticsRouter } from "./routes/analyticsRoutes.js";
import { attendanceRouter } from "./routes/attendanceRoutes.js";
import { reportRouter } from "./routes/reportRoutes.js";
import { targetRouter } from "./routes/targetRoutes.js";
import { taskRouter } from "./routes/taskRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { apiLimiter, authLimiter } from "./middleware/rateLimit.js";

import { adminRouter } from "./routes/adminRoutes.js";
import swaggerUi from "swagger-ui-express";
import yaml from "yamljs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadSwaggerDoc() {
  const file = path.join(__dirname, "docs", "swagger.yaml");
  const content = fs.readFileSync(file, "utf8").replace(/\u00a0/g, " ");
  return yaml.parse(content);
}

export function createApp() {
  const app = express();

  // Trust Render's load balancer so that secure cookies are properly set over HTTPS.
  app.set("trust proxy", 1);

  // CLIENT_ORIGIN can be a single URL or comma-separated list for multi-deploy support.
  // e.g. "https://tgms.vercel.app,http://localhost:5173"
  const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  // Security headers. CSP is relaxed for DevTools/Swagger UI (inline styles/scripts);
  // production gets the stricter default (swagger is disabled there anyway).
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "script-src": ["'self'", "'unsafe-inline'"],
          "style-src": ["'self'", "'unsafe-inline'"],
          "img-src": ["'self'", "data:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS — dynamic origin check so both Vercel prod and localhost dev work.
  app.use(
    cors({
      origin(origin, cb) {
        // Allow requests with no origin (mobile apps, curl, server-to-server).
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
    })
  );

  // Parse the Cookie header into req.cookies (required by `authenticate`).
  app.use(cookieParser());

  // Body parsers (JSON + form-encoded).
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging (short "dev" format locally, "combined" in production).
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  // Rate limiting — global cap on /api, tighter cap on /api/auth (brute-force guard).
  app.use("/api", apiLimiter);
  app.use("/api/auth", authLimiter);
  app.use("/api/admin", adminRouter);

  // API documentation (Swagger UI) — development/testing only, never in production.
  if (process.env.NODE_ENV !== "production") {
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(loadSwaggerDoc()));
  }

  // Routes — all API routes live under /api.
  app.use("/api", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/progress", progressRouter);
  app.use("/api/students", studentRouter);
  app.use("/api/notices", noticeRouter);
  app.use("/api/groups", groupRouter);
  app.use("/api/bulk", bulkRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/attendance", attendanceRouter);
  app.use("/api/reports", reportRouter);
  app.use("/api/targets", targetRouter);
  app.use("/api/tasks", taskRouter);

  // Error handling — must be registered LAST.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}