import "server-only";

import type { IntegrationConnectionStatus } from "@/generated/prisma/enums";
import { decrypt, encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import {
  estimateHiggsfieldClip,
  estimateHiggsfieldJob,
  higgsfieldInsufficientCredits,
  parseHiggsfieldCredentials,
  type HiggsfieldCredentials,
} from "@/features/higgsfield/api";
import type { HiggsfieldAccountQuote, HiggsfieldAccountView } from "@/features/higgsfield/accountView";
import { higgsfieldAspect, higgsfieldDurationNote } from "@/features/higgsfield/duration";
import { higgsfieldDurationFor, higgsfieldModel } from "@/features/higgsfield/models";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function view(row: {
  id: string;
  email: string;
  enabled: boolean;
  status: IntegrationConnectionStatus;
  apiKeyLast4: string;
  estimateCredits: string | null;
  estimateUsd: string | null;
  lastErrorMessage: string | null;
}): HiggsfieldAccountView {
  return {
    id: row.id,
    email: row.email,
    enabled: row.enabled,
    status: row.status,
    maskedKey: `••••${row.apiKeyLast4}`,
    estimateCredits: row.estimateCredits,
    estimateUsd: row.estimateUsd,
    lastErrorMessage: row.lastErrorMessage,
  };
}

function storedEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 200) {
    throw new Error("Enter the email address for this Higgsfield account.");
  }
  return email;
}

export async function listHiggsfieldAccounts(userId: string): Promise<HiggsfieldAccountView[]> {
  const rows = await prisma.higgsfieldAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(view);
}

export async function listEnabledHiggsfieldAccounts(
  userId: string,
): Promise<HiggsfieldAccountView[]> {
  const rows = await prisma.higgsfieldAccount.findMany({
    where: { userId, enabled: true, status: "CONNECTED" },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(view);
}

async function credentialsFor(userId: string, accountId: string): Promise<HiggsfieldCredentials> {
  const row = await prisma.higgsfieldAccount.findFirst({
    where: { id: accountId, userId, enabled: true, status: "CONNECTED" },
    select: { apiKeyEnc: true },
  });
  if (!row) throw new Error("Choose an enabled Higgsfield account.");
  return parseHiggsfieldCredentials(decrypt(row.apiKeyEnc));
}

export async function addHiggsfieldAccount(
  userId: string,
  emailInput: string,
  apiKeyInput: string,
): Promise<{ account: HiggsfieldAccountView; message: string }> {
  const email = storedEmail(emailInput);
  const credentials = parseHiggsfieldCredentials(apiKeyInput);
  const apiKey = credentials.secret
    ? `${credentials.keyId}:${credentials.secret}`
    : credentials.keyId;
  let estimateCredits: string | null = null;
  let estimateUsd: string | null = null;
  let lastErrorMessage: string | null = null;
  try {
    const estimate = await estimateHiggsfieldClip(credentials);
    estimateCredits = estimate.credits;
    estimateUsd = estimate.usd;
  } catch (error) {
    if (!higgsfieldInsufficientCredits(error)) throw error;
    lastErrorMessage = error instanceof Error ? error.message : "Not enough credits.";
  }
  const message = lastErrorMessage
    ? `Connected ${email}. ${lastErrorMessage}`
    : `Connected ${email}.`;

  const row = await prisma.higgsfieldAccount.upsert({
    where: { userId_email: { userId, email } },
    create: {
      userId,
      email,
      apiKeyEnc: encrypt(apiKey),
      apiKeyLast4: apiKey.slice(-4),
      status: "CONNECTED",
      enabled: true,
      estimateCredits,
      estimateUsd,
      lastErrorMessage,
    },
    update: {
      apiKeyEnc: encrypt(apiKey),
      apiKeyLast4: apiKey.slice(-4),
      status: "CONNECTED",
      enabled: true,
      estimateCredits,
      estimateUsd,
      lastErrorMessage,
    },
  });
  return { account: view(row), message };
}

export async function setHiggsfieldAccountEnabled(
  userId: string,
  accountId: string,
  enabled: boolean,
): Promise<void> {
  const updated = await prisma.higgsfieldAccount.updateMany({
    where: { id: accountId, userId },
    data: { enabled },
  });
  if (!updated.count) throw new Error("That Higgsfield account was not found.");
}

export async function removeHiggsfieldAccount(userId: string, accountId: string): Promise<void> {
  const removed = await prisma.higgsfieldAccount.deleteMany({
    where: { id: accountId, userId },
  });
  if (!removed.count) throw new Error("That Higgsfield account was not found.");
}

export async function quoteHiggsfieldAccounts(
  userId: string,
  input: { prompt: string; durationSeconds: number; aspectRatio: string; modelId?: string },
): Promise<{ accounts: HiggsfieldAccountQuote[]; durationSeconds: number; note: string | null }> {
  const rows = await prisma.higgsfieldAccount.findMany({
    where: { userId, enabled: true, status: "CONNECTED" },
    orderBy: { createdAt: "asc" },
  });
  const model = higgsfieldModel(input.modelId);
  const sized = higgsfieldDurationFor(model, input.durationSeconds);
  const aspectRatio = higgsfieldAspect(input.aspectRatio);
  const prompt = input.prompt.trim().slice(0, 2500) || "A quiet cinematic shot.";

  const accounts = await Promise.all(
    rows.map(async (row) => {
      const base = view(row);
      try {
        const estimate = await estimateHiggsfieldJob(parseHiggsfieldCredentials(decrypt(row.apiKeyEnc)), {
          prompt,
          duration: sized.duration,
          aspectRatio,
          model,
        });
        return {
          ...base,
          quoteCredits: estimate.credits,
          quoteUsd: estimate.usd,
          quoteError: null,
        };
      } catch (error) {
        return {
          ...base,
          quoteCredits: null,
          quoteUsd: null,
          quoteError: error instanceof Error ? error.message : "Could not estimate this account.",
        };
      }
    }),
  );
  return {
    accounts,
    durationSeconds: sized.duration,
    note: higgsfieldDurationNote(input.durationSeconds, sized.duration),
  };
}

export async function higgsfieldCredentialsForAccount(
  userId: string,
  accountId: string,
): Promise<HiggsfieldCredentials> {
  return credentialsFor(userId, accountId);
}

export async function touchHiggsfieldAccount(userId: string, accountId: string): Promise<void> {
  await prisma.higgsfieldAccount.updateMany({
    where: { id: accountId, userId },
    data: { lastUsedAt: new Date(), lastErrorMessage: null },
  });
}
