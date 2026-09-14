import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const rows = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;
    if (!rows?.[0] || Number(rows[0].ok) !== 1) {
      throw new Error(`Unexpected query result: ${JSON.stringify(rows)}`);
    }
    console.log("Supabase connection OK (SELECT 1)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Supabase connection FAILED");
  console.error(error);
  process.exit(1);
});
