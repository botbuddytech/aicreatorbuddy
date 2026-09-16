-- CreateEnum
CREATE TYPE "VideoSessionStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'RENDERED', 'EXPORTED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "CreateStep" AS ENUM ('SUMMARY', 'TITLE', 'THUMBNAIL', 'SCRIPT', 'TIMELINE', 'DESCRIPTION', 'RENDER', 'EDITOR');

-- CreateEnum
CREATE TYPE "StepState" AS ENUM ('NOT_STARTED', 'DRAFT', 'GENERATED', 'APPROVED');

-- CreateEnum
CREATE TYPE "VideoAssetKind" AS ENUM ('UPLOADED_CLIP', 'AI_IMAGE', 'VOICEOVER', 'CUSTOM_THUMBNAIL', 'STOCK');

-- CreateEnum
CREATE TYPE "VideoAssetSource" AS ENUM ('MANUAL_UPLOAD', 'AI_GENERATED', 'STOCK', 'EXTERNAL_URL');

-- CreateEnum
CREATE TYPE "VideoExportStatus" AS ENUM ('STARTED', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "VideoSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL DEFAULT 'Untitled video',
    "status" "VideoSessionStatus" NOT NULL DEFAULT 'DRAFT',
    "currentStep" "CreateStep" NOT NULL DEFAULT 'SUMMARY',
    "channelId" TEXT,
    "channelTitle" TEXT,
    "topic" TEXT NOT NULL DEFAULT '',
    "format" TEXT NOT NULL DEFAULT 'long-form',
    "aspectRatio" TEXT NOT NULL DEFAULT '16:9',
    "intent" TEXT NOT NULL DEFAULT 'educational',
    "targetDurationSec" INTEGER NOT NULL DEFAULT 480,
    "referenceCount" INTEGER NOT NULL DEFAULT 0,
    "apiCallCount" INTEGER NOT NULL DEFAULT 0,
    "generationCount" INTEGER NOT NULL DEFAULT 0,
    "regenerateCount" INTEGER NOT NULL DEFAULT 0,
    "manualClipCount" INTEGER NOT NULL DEFAULT 0,
    "aiVisualCount" INTEGER NOT NULL DEFAULT 0,
    "voiceoverCount" INTEGER NOT NULL DEFAULT 0,
    "sceneCount" INTEGER NOT NULL DEFAULT 0,
    "approvedStepCount" INTEGER NOT NULL DEFAULT 0,
    "exportAttemptCount" INTEGER NOT NULL DEFAULT 0,
    "exportSuccessCount" INTEGER NOT NULL DEFAULT 0,
    "timelineSeconds" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renderedAt" TIMESTAMP(3),
    "firstExportedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VideoSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoSessionStep" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "step" "CreateStep" NOT NULL,
    "state" "StepState" NOT NULL DEFAULT 'NOT_STARTED',
    "provider" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "generationCount" INTEGER NOT NULL DEFAULT 0,
    "editCount" INTEGER NOT NULL DEFAULT 0,
    "apiCallCount" INTEGER NOT NULL DEFAULT 0,
    "timeSpentMs" INTEGER NOT NULL DEFAULT 0,
    "enteredAt" TIMESTAMP(3),
    "firstGeneratedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoSessionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoSessionEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "step" "CreateStep",
    "type" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "sequence" INTEGER NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "clientEventId" TEXT NOT NULL,

    CONSTRAINT "VideoSessionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoSessionApiCall" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "step" "CreateStep" NOT NULL,
    "tool" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "estimatedUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "latencyMs" INTEGER,
    "at" TIMESTAMP(3) NOT NULL,
    "clientCallId" TEXT NOT NULL,

    CONSTRAINT "VideoSessionApiCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoSessionAsset" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sceneKey" TEXT,
    "kind" "VideoAssetKind" NOT NULL,
    "source" "VideoAssetSource" NOT NULL,
    "addedAtStep" "CreateStep" NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "durationSec" DOUBLE PRECISION,
    "localClipId" TEXT,
    "storageUrl" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "VideoSessionAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoSessionScene" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sceneKey" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "sectionLabel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "durationSec" DOUBLE PRECISION NOT NULL,
    "trimStartSec" DOUBLE PRECISION NOT NULL,
    "transition" TEXT NOT NULL,
    "filter" TEXT NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL,
    "volume" INTEGER NOT NULL,
    "hasClip" BOOLEAN NOT NULL,
    "hasVoiceover" BOOLEAN NOT NULL,
    "wordCount" INTEGER NOT NULL,

    CONSTRAINT "VideoSessionScene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoSessionExport" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "status" "VideoExportStatus" NOT NULL,
    "fileName" TEXT,
    "format" TEXT NOT NULL,
    "aspectRatio" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "runtimeSec" DOUBLE PRECISION NOT NULL,
    "sceneCount" INTEGER NOT NULL,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "VideoSessionExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoSessionCheck" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "findings" JSONB NOT NULL DEFAULT '[]',
    "checkedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoSessionCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoSession_userId_lastActiveAt_idx" ON "VideoSession"("userId", "lastActiveAt" DESC);

-- CreateIndex
CREATE INDEX "VideoSession_channelId_idx" ON "VideoSession"("channelId");

-- CreateIndex
CREATE INDEX "VideoSession_status_idx" ON "VideoSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VideoSessionStep_sessionId_step_key" ON "VideoSessionStep"("sessionId", "step");

-- CreateIndex
CREATE UNIQUE INDEX "VideoSessionEvent_clientEventId_key" ON "VideoSessionEvent"("clientEventId");

-- CreateIndex
CREATE INDEX "VideoSessionEvent_sessionId_at_idx" ON "VideoSessionEvent"("sessionId", "at");

-- CreateIndex
CREATE INDEX "VideoSessionEvent_sessionId_sequence_idx" ON "VideoSessionEvent"("sessionId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "VideoSessionApiCall_clientCallId_key" ON "VideoSessionApiCall"("clientCallId");

-- CreateIndex
CREATE INDEX "VideoSessionApiCall_sessionId_at_idx" ON "VideoSessionApiCall"("sessionId", "at");

-- CreateIndex
CREATE INDEX "VideoSessionAsset_sessionId_addedAt_idx" ON "VideoSessionAsset"("sessionId", "addedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VideoSessionAsset_sessionId_localClipId_key" ON "VideoSessionAsset"("sessionId", "localClipId");

-- CreateIndex
CREATE INDEX "VideoSessionScene_sessionId_order_idx" ON "VideoSessionScene"("sessionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "VideoSessionScene_sessionId_sceneKey_key" ON "VideoSessionScene"("sessionId", "sceneKey");

-- CreateIndex
CREATE INDEX "VideoSessionExport_sessionId_startedAt_idx" ON "VideoSessionExport"("sessionId", "startedAt");

-- CreateIndex
CREATE INDEX "VideoSessionCheck_sessionId_checkedAt_idx" ON "VideoSessionCheck"("sessionId", "checkedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VideoSessionCheck_sessionId_scope_sourceHash_key" ON "VideoSessionCheck"("sessionId", "scope", "sourceHash");

-- AddForeignKey
ALTER TABLE "VideoSession" ADD CONSTRAINT "VideoSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSession" ADD CONSTRAINT "VideoSession_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "YoutubeChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSessionStep" ADD CONSTRAINT "VideoSessionStep_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VideoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSessionEvent" ADD CONSTRAINT "VideoSessionEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VideoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSessionApiCall" ADD CONSTRAINT "VideoSessionApiCall_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VideoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSessionAsset" ADD CONSTRAINT "VideoSessionAsset_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VideoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSessionScene" ADD CONSTRAINT "VideoSessionScene_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VideoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSessionExport" ADD CONSTRAINT "VideoSessionExport_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VideoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSessionCheck" ADD CONSTRAINT "VideoSessionCheck_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VideoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
