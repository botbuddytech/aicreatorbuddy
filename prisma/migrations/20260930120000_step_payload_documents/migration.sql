-- AlterTable
ALTER TABLE "VideoSessionStep" ADD COLUMN "payload" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "VideoSessionStep" ADD COLUMN "schemaVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "VideoSessionReference" ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';
