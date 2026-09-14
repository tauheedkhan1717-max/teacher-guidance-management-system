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

  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

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

  // CORS — allow the React dev server; credentials:true because auth is a cookie.
  app.use(cors({ origin: clientOrigin, credentials: true }));

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

  // Error handling — must be registered LAST.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}