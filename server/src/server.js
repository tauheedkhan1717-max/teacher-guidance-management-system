// Entry point — starts the HTTP server and shuts down gracefully on SIGINT/SIGTERM.
import "dotenv/config";
import { createApp } from "./app.js";
import { prisma } from "./lib/prisma.js";
import { validateEnv } from "./config/env.js";

// Validate required environment variables BEFORE wiring the app.
// (PrismaClient construction is lazy — no DB connection happens until first query.)
try {
  validateEnv();
} catch (err) {
  console.error(`[env] ${err.message}`);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

const app = createApp();
const server = app.listen(PORT, () => {
  console.log(`TGMS API listening on http://localhost:${PORT} (${process.env.NODE_ENV || "development"})`);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received — shutting down gracefully...`);

  // Stop accepting new connections, then close the DB connection and exit.
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } finally {
      process.exit(0);
    }
  });

  // Safety net: force exit if connections refuse to drain within 5 seconds.
  setTimeout(() => {
    console.error("Forced exit after timeout.");
    process.exit(1);
  }, 5000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));