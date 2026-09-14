// Health check endpoint: proves the Express server is up AND can reach PostgreSQL.
import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();
const startedAt = Date.now();

router.get("/health", async (req, res) => {
  try {
    // `SELECT 1` is the standard "is the database alive?" probe.
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      service: "tgms-api",
      database: "connected",
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: "degraded",
      service: "tgms-api",
      database: "disconnected",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export const healthRouter = router;