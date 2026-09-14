// Startup environment validation — fail fast with a clear message instead of
// crashing later inside a request with a confusing Prisma/JWT error.
// Called once from src/server.js before the app listens.

const REQUIRED = ["DATABASE_URL", "JWT_SECRET"];

export function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key] || !process.env[key].trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
      `Copy server/.env.example to server/.env and fill in real values.`
    );
  }

  if (process.env.NODE_ENV === "production") {
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error(
        "JWT_SECRET must be at least 32 characters in production. " +
        "Generate one with: openssl rand -hex 32"
      );
    }
    if ((process.env.JWT_SECRET || "").startsWith("dev-only")) {
      throw new Error("JWT_SECRET is still the development placeholder — set a real secret in production.");
    }
    if (!process.env.CLIENT_ORIGIN) {
      throw new Error("CLIENT_ORIGIN must be set in production (the exact Vercel frontend URL).");
    }
  }

  return true;
}