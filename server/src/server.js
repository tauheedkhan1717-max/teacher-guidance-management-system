import "dotenv/config";
import { createApp } from "./app.js";
import { prisma } from "./lib/prisma.js";
import { validateEnv } from "./config/env.js";

try {
  validateEnv();
} catch (err) {
  console.error(`[env] ${err.message}`);
  process.exit(1);
}

const PORT = process.env.PORT || 4000;

const app = createApp();
const server = app.listen(PORT, () => {
  console.log(`TGMS API listening on http://localhost:${PORT} (${process.env.NODE_ENV || "development"})`);
});

server.on("error", (err) => {
  console.error("SERVER ERROR:", err);
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Please kill the process using it.`);
  }
  process.exit(1);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received — shutting down gracefully...`);

  server.close(async () => {
    try {
      await prisma.$disconnect();
    } finally {
      process.exit(0);
    }
  });

  setTimeout(() => {
    console.error("Forced exit after timeout.");
    process.exit(1);
  }, 5000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
