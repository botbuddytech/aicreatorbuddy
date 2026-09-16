-- CreateEnum
CREATE TYPE "ReferenceTranscriptStatus" AS ENUM ('EMPTY', 'FETCHING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "VideoSessionReference" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "referenceKey" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "url" TEXT NOT NULL DEFAULT '',
    "videoId" TEXT,
    "status" "ReferenceTranscriptStatus" NOT NULL DEFAULT 'EMPTY',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "lang" TEXT,
    "transcript" TEXT NOT NULL DEFAULT '',
    "segments" JSONB NOT NULL DEFAULT '[]',
    "charCount" INTEGER NOT NULL DEFAULT 0,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "durationSec" DOUBLE PRECISION,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "fetchedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoSessionReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoSessionReference_sessionId_order_idx" ON "VideoSessionReference"("sessionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "VideoSessionReference_sessionId_referenceKey_key" ON "VideoSessionReference"("sessionId", "referenceKey");

-- AddForeignKey
ALTER TABLE "VideoSessionReference" ADD CONSTRAINT "VideoSessionReference_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VideoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
