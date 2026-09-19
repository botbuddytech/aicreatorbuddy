-- AlterTable
ALTER TABLE "CursorPromptSettings"
    ADD COLUMN "scriptScoringPrompt" TEXT,
    ADD COLUMN "scriptLowEffortPrompt" TEXT;

-- AlterTable
ALTER TABLE "VideoSessionCheck"
    ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'static',
    ADD COLUMN "summary" TEXT;

-- ReplaceIndex
DROP INDEX "VideoSessionCheck_sessionId_scope_sourceHash_key";
CREATE UNIQUE INDEX "VideoSessionCheck_sessionId_scope_sourceHash_provider_key"
    ON "VideoSessionCheck"("sessionId", "scope", "sourceHash", "provider");
