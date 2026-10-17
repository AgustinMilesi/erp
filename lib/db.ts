import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { db: PrismaClient | undefined };

export const db =
  globalForPrisma.db ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.db = db;

