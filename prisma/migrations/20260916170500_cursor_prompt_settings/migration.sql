-- CreateTable
CREATE TABLE "CursorPromptSettings" (
    "userId" TEXT NOT NULL,
    "titleGenerationPrompt" TEXT,
    "titleScoringPrompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CursorPromptSettings_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "CursorPromptSettings"
    ADD CONSTRAINT "CursorPromptSettings_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
