CREATE TABLE "HiggsfieldAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "apiKeyEnc" TEXT NOT NULL,
    "apiKeyLast4" TEXT NOT NULL,
    "status" "IntegrationConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "estimateCredits" TEXT,
    "estimateUsd" TEXT,
    "lastErrorMessage" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HiggsfieldAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HiggsfieldAccount_userId_email_key" ON "HiggsfieldAccount"("userId", "email");

CREATE INDEX "HiggsfieldAccount_userId_enabled_idx" ON "HiggsfieldAccount"("userId", "enabled");

ALTER TABLE "HiggsfieldAccount" ADD CONSTRAINT "HiggsfieldAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
