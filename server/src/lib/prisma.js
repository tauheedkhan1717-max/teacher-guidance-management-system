// Shared Prisma client — one connection reused across the whole API.
// dotenv is loaded here so DATABASE_URL is set before the client is constructed.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();