import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prefer DIRECT_URL (session/non-pooler) for migrations. Fall back to a
// placeholder so `prisma generate` succeeds during image builds when only
// runtime DATABASE_URL will be injected later (e.g. Railway private networking).
const datasourceUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/postgres";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: { url: datasourceUrl },
});
