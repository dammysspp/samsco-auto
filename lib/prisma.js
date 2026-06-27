import { PrismaClient } from "@prisma/client";

console.log(
  "[Prisma Init] DATABASE_URL is defined:",
  !!process.env.DATABASE_URL,
);

const globalForPrisma = global;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
