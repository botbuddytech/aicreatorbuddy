-- AlterTable
ALTER TABLE "CursorPromptSettings"
    ADD COLUMN "titleGenerationDefault" TEXT,
    ADD COLUMN "titleScoringDefault" TEXT,
    ADD COLUMN "scriptScoringDefault" TEXT,
    ADD COLUMN "scriptLowEffortDefault" TEXT;
