// Small helper for writing consistent AuditLog rows.
// Captures before/after as JSON snapshots so corrections stay traceable.
import { prisma } from "../lib/prisma.js";

export function auditLog({ actorId, action, entityType, entityId, before, after }, client = prisma) {
  return client.auditLog.create({
    data: {
      actorId,
      action,      // e.g. "PROGRESS_CREATE" | "PROGRESS_UPDATE" | "STUDENT_UPDATE"
      entityType,
      entityId,
      before: before ?? undefined,
      after: after ?? undefined,
    },
  });
}