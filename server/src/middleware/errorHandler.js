// Centralised error handling for the TGMS Express API.
// Registration order in app.js matters:
//   notFound()  runs for any route we did not define,
//   errorHandler() catches everything and MUST be registered last.
import { Prisma } from "@prisma/client";

// 404 for unmatched routes.
export function notFound(req, res) {
  res.status(404).json({
    error: {
      message: `No route for ${req.method} ${req.originalUrl}`,
    },
  });
}

// The catch-all error handler. Every error thrown (or passed to next(err)) lands here.
export function errorHandler(err, req, res, next) {
  console.error("[errorHandler] Caught Error:", err);
  
  // 1) Errors that already carry an HTTP status (custom errors set err.status).
  if (typeof err.status === "number" && err.status >= 400 && err.status < 600) {
    return res.status(err.status).json({ error: { message: err.message } });
  }

  // 2) Prisma "known request" errors — database-level problems.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      // Unique constraint violation (e.g. duplicate roll number or email).
      return res.status(409).json({
        error: { message: "A record with that unique value already exists.", code: err.code },
      });
    }
    if (err.code === "P2003") {
      // Foreign key constraint failed — expose which field so we can see the real cause.
      // err.meta?.field_name looks like "StudentProfile_classId_fkey (index)".
      const field = err.meta?.field_name || "unknown";
      const isProd = process.env.NODE_ENV === "production";
      return res.status(400).json({
        error: {
          message: `Referenced record does not exist (foreign key: ${field}).`,
          code: err.code,
          ...(isProd ? {} : { detail: err.message, field }),
        },
      });
    }
    if (err.code === "P2025") {
      // Record not found.
      return res.status(404).json({
        error: { message: "The requested record was not found.", code: err.code },
      });
    }
    const isProd = process.env.NODE_ENV === "production";
    return res.status(400).json({
      error: {
        message: "Database request failed.",
        code: err.code,
        ...(isProd ? {} : { detail: err.message }),
      },
    });
  }

  // 3) Prisma validation error — a bug in our query construction.
  if (err instanceof Prisma.PrismaClientValidationError) {
    console.error(`[errorHandler] ${err.message}`);
    return res.status(500).json({
      error: { message: "Invalid database query.", code: "DB_VALIDATION" },
    });
  }

  // 4) Prisma client could not initialise — e.g. PostgreSQL is unreachable.
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return res.status(503).json({
      error: { message: "Database is unavailable.", code: "DB_UNAVAILABLE" },
    });
  }

  // 5) Everything else — never leak internals to the client.
  console.error(`[errorHandler] ${err.stack || err}`);
  const isProd = process.env.NODE_ENV === "production";
  return res.status(500).json({
    error: {
      message: "Internal server error.",
      ...(isProd ? {} : { detail: err.message }),
    },
  });
}