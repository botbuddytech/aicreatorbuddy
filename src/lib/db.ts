import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

// Typed loosely: after a client regeneration this holds an instance of the previous PrismaClient class.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient | { $disconnect(): Promise<void> };
};

function getPrisma(): PrismaClient {
  const existing = globalForPrisma.prisma;
  // A regenerated client is a new class. Drop the previous instance so new columns are visible.
  if (existing instanceof PrismaClient) return existing;
  if (existing) void existing.$disconnect().catch(() => undefined);
  const client = createClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}

export const prisma: PrismaClient = getPrisma();
