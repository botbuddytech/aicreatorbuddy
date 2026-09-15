import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { demoAuth, demoProfile } from "../src/lib/dashboardContent";

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL or DIRECT_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const email = demoAuth.email.trim().toLowerCase();
  const passwordHash = await hashPassword(demoAuth.password);

  await prisma.user.upsert({
    where: { email },
    update: {
      name: demoProfile.name,
      passwordHash,
    },
    create: {
      email,
      name: demoProfile.name,
      passwordHash,
    },
  });

  console.log(`Seeded demo user: ${email}`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
