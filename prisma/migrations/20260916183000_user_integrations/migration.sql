CREATE TYPE "IntegrationProvider" AS ENUM (
  'YOUTUBE',
  'VIDIQ',
  'CHATGPT',
  'GEMINI',
  'ELEVENLABS',
  'SEEDANCE',
  'REMOTION'
);

CREATE TYPE "IntegrationAuthKind" AS ENUM ('OAUTH', 'API_KEY', 'NONE');

CREATE TYPE "IntegrationConnectionStatus" AS ENUM (
  'NOT_CONNECTED',
  'CONNECTED',
  'NEEDS_REAUTH',
  'INVALID_KEY',
  'REVOKED'
);

CREATE TABLE "UserIntegration" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "IntegrationProvider" NOT NULL,
  "authKind" "IntegrationAuthKind" NOT NULL,
  "status" "IntegrationConnectionStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "apiKeyEnc" TEXT,
  "apiKeyLast4" TEXT,
  "apiKeyAddedAt" TIMESTAMP(3),
  "accessTokenEnc" TEXT,
  "refreshTokenEnc" TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "scope" TEXT,
  "oauthClientId" TEXT,
  "accountLabel" TEXT,
  "plan" TEXT,
  "environment" TEXT NOT NULL DEFAULT 'Production',
  "quotaUsed" INTEGER,
  "quotaLimit" INTEGER,
  "quotaUnit" TEXT,
  "quotaResetsAt" TIMESTAMP(3),
  "quotaSyncedAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "lastErrorAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserIntegration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationUsage" (
  "id" TEXT NOT NULL,
  "userIntegrationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "IntegrationProvider" NOT NULL,
  "operation" TEXT NOT NULL,
  "method" TEXT,
  "httpStatus" INTEGER,
  "ok" BOOLEAN NOT NULL DEFAULT true,
  "latencyMs" INTEGER,
  "units" INTEGER NOT NULL DEFAULT 0,
  "estimatedUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
  "sessionId" TEXT,
  "step" "CreateStep",
  "channelId" TEXT,
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "IntegrationUsage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "McpClientRegistration" (
  "id" TEXT NOT NULL,
  "server" TEXT NOT NULL,
  "redirectUri" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "clientSecret" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "McpClientRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserIntegration_userId_provider_key"
  ON "UserIntegration"("userId", "provider");
CREATE INDEX "UserIntegration_provider_status_idx"
  ON "UserIntegration"("provider", "status");
CREATE INDEX "IntegrationUsage_userId_provider_at_idx"
  ON "IntegrationUsage"("userId", "provider", "at" DESC);
CREATE INDEX "IntegrationUsage_userIntegrationId_at_idx"
  ON "IntegrationUsage"("userIntegrationId", "at" DESC);
CREATE UNIQUE INDEX "McpClientRegistration_server_redirectUri_key"
  ON "McpClientRegistration"("server", "redirectUri");

ALTER TABLE "UserIntegration"
  ADD CONSTRAINT "UserIntegration_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntegrationUsage"
  ADD CONSTRAINT "IntegrationUsage_userIntegrationId_fkey"
  FOREIGN KEY ("userIntegrationId") REFERENCES "UserIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
