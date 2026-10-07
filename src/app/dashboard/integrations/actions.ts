"use server";

import { revalidatePath } from "next/cache";
import type { IntegrationProvider } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/session";
import { decrypt, encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { getElevenLabsSnapshot } from "@/features/elevenlabs/account";
import {
  estimateHiggsfieldClip,
  higgsfieldEstimateLabel,
  parseHiggsfieldCredentials,
} from "@/features/higgsfield/api";
import { integrationCatalogItem } from "@/lib/integrations/catalog";
import { callVidiqTool } from "@/lib/vidiq/client";
import {
  addHiggsfieldAccount,
  removeHiggsfieldAccount,
  setHiggsfieldAccountEnabled,
} from "@/features/higgsfield/accounts";

export type IntegrationActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function done(message: string): IntegrationActionResult {
  revalidatePath("/dashboard/integrations");
  return { ok: true, message };
}

function failure(error: unknown, fallback: string): IntegrationActionResult {
  const message = error instanceof Error ? error.message : "";
  return {
    ok: false,
    error: message === "UNAUTHORIZED" ? "Please log in again." : (message || fallback).slice(0, 300),
  };
}

async function probeApiKey(
  provider: IntegrationProvider,
  key: string,
): Promise<string> {
  let response: Response;
  switch (provider) {
    case "CHATGPT":
      response = await fetch("https://api.openai.com/v1/models", {
        headers: { authorization: `Bearer ${key}` },
        cache: "no-store",
      });
      break;
    case "GEMINI":
      response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
        headers: { "x-goog-api-key": key },
        cache: "no-store",
      });
      break;
    case "ELEVENLABS":
      response = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
        headers: { "xi-api-key": key },
        cache: "no-store",
      });
      break;
    case "SEEDANCE":
      return "Key saved. Seedance does not expose a safe account probe, so it will be verified on first use.";
    case "HIGGSFIELD":
      return higgsfieldEstimateLabel(
        await estimateHiggsfieldClip(parseHiggsfieldCredentials(key)),
      ).message;
    default:
      throw new Error("This provider does not use an API key.");
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 401 || response.status === 403) {
      throw new Error("The provider rejected this API key.");
    }
    throw new Error(
      detail
        ? `Provider check failed (${response.status}).`
        : "The provider could not verify this key.",
    );
  }
  return "Connection verified.";
}

export async function saveApiKeyAction(
  integrationId: string,
  apiKeyInput: string,
): Promise<IntegrationActionResult> {
  try {
    const user = await requireUser();
    const item = integrationCatalogItem(integrationId);
    if (!item || item.authKind !== "API_KEY") {
      return { ok: false, error: "This integration does not accept an API key." };
    }
    if (item.sharedEnv) {
      return { ok: false, error: "ElevenLabs uses the shared server key." };
    }
    const apiKey = apiKeyInput.trim();
    if (apiKey.length < 8 || apiKey.length > 2048 || /\s/.test(apiKey)) {
      return { ok: false, error: "Enter a valid API key." };
    }
    if (item.keyPrefix && !apiKey.startsWith(item.keyPrefix)) {
      return { ok: false, error: `This key should start with ${item.keyPrefix}.` };
    }

    const higgsfield =
      item.provider === "HIGGSFIELD"
        ? higgsfieldEstimateLabel(
            await estimateHiggsfieldClip(parseHiggsfieldCredentials(apiKey)),
          )
        : null;
    const message = higgsfield?.message ?? (await probeApiKey(item.provider, apiKey));
    await prisma.userIntegration.upsert({
      where: { userId_provider: { userId: user.id, provider: item.provider } },
      create: {
        userId: user.id,
        provider: item.provider,
        authKind: "API_KEY",
        status: "CONNECTED",
        enabled: true,
        apiKeyEnc: encrypt(apiKey),
        apiKeyLast4: apiKey.slice(-4),
        apiKeyAddedAt: new Date(),
        plan: higgsfield?.plan ?? null,
        accountLabel: higgsfield?.accountLabel ?? null,
      },
      update: {
        authKind: "API_KEY",
        status: "CONNECTED",
        enabled: true,
        apiKeyEnc: encrypt(apiKey),
        apiKeyLast4: apiKey.slice(-4),
        apiKeyAddedAt: new Date(),
        plan: higgsfield?.plan ?? null,
        accountLabel: higgsfield?.accountLabel ?? null,
        lastErrorCode: null,
        lastErrorMessage: null,
        lastErrorAt: null,
      },
    });
    return done(message);
  } catch (error) {
    return failure(error, "Could not save the API key.");
  }
}

export async function removeCredentialAction(
  integrationId: string,
): Promise<IntegrationActionResult> {
  try {
    const user = await requireUser();
    const item = integrationCatalogItem(integrationId);
    if (!item) return { ok: false, error: "Unknown integration." };
    if (item.provider === "YOUTUBE") {
      return { ok: false, error: "Disconnect YouTube channels from the Channels page." };
    }
    if (item.sharedEnv) {
      return { ok: false, error: "ElevenLabs uses the shared server key." };
    }

    await prisma.userIntegration.updateMany({
      where: { userId: user.id, provider: item.provider },
      data: {
        status: "REVOKED",
        enabled: false,
        apiKeyEnc: null,
        apiKeyLast4: null,
        apiKeyAddedAt: null,
        accessTokenEnc: null,
        refreshTokenEnc: null,
        tokenExpiresAt: null,
        scope: null,
        accountLabel: null,
        plan: null,
        quotaUsed: null,
        quotaLimit: null,
        quotaUnit: null,
        quotaResetsAt: null,
      },
    });
    return done("Integration disconnected.");
  } catch (error) {
    return failure(error, "Could not disconnect the integration.");
  }
}

export async function setIntegrationEnabledAction(
  integrationId: string,
  enabled: boolean,
): Promise<IntegrationActionResult> {
  try {
    const user = await requireUser();
    const item = integrationCatalogItem(integrationId);
    if (!item) return { ok: false, error: "Unknown integration." };
    const row = await prisma.userIntegration.findUnique({
      where: { userId_provider: { userId: user.id, provider: item.provider } },
    });
    if (!row || row.status !== "CONNECTED") {
      return { ok: false, error: "Connect this integration before enabling it." };
    }
    await prisma.userIntegration.update({
      where: { id: row.id },
      data: { enabled },
    });
    return done(enabled ? "Integration enabled." : "Integration paused.");
  } catch (error) {
    return failure(error, "Could not update the integration.");
  }
}

export async function testIntegrationAction(
  integrationId: string,
): Promise<IntegrationActionResult> {
  let target: { userId: string; provider: IntegrationProvider } | null = null;
  try {
    const user = await requireUser();
    const item = integrationCatalogItem(integrationId);
    if (!item) return { ok: false, error: "Unknown integration." };
    target = { userId: user.id, provider: item.provider };

    if (item.provider === "VIDIQ") {
      await callVidiqTool(user.id, "vidiq_balance", {}, { allowDisabled: true });
      return done("vidIQ connection verified and credits refreshed.");
    }
    if (item.provider === "YOUTUBE") {
      const count = await prisma.youtubeChannel.count({
        where: { userId: user.id, status: "ACTIVE" },
      });
      if (!count) throw new Error("No active YouTube channel is connected.");
      return done(`${count} YouTube channel${count === 1 ? "" : "s"} connected.`);
    }
    if (item.provider === "ELEVENLABS") {
      const snapshot = await getElevenLabsSnapshot({ fresh: true });
      if (!snapshot.configured) throw new Error("ELEVEN_LABS_API_KEY is not configured.");
      if (!snapshot.ok) throw new Error(snapshot.error || "ElevenLabs connection failed.");
      await prisma.userIntegration.update({
        where: { userId_provider: { userId: user.id, provider: "ELEVENLABS" } },
        data: {
          status: "CONNECTED",
          enabled: true,
          accountLabel: "Shared environment key",
          plan: snapshot.tier,
          lastErrorCode: null,
          lastErrorMessage: null,
          lastErrorAt: null,
        },
      });
      return done(
        snapshot.quotaError
          ? `Connection verified. ${snapshot.quotaError}`
          : `ElevenLabs connection verified${snapshot.tier ? ` (${snapshot.tier})` : ""}.`,
      );
    }
    if (item.authKind === "NONE") return done("Local integration is available.");

    const row = await prisma.userIntegration.findUnique({
      where: { userId_provider: { userId: user.id, provider: item.provider } },
      select: { id: true, apiKeyEnc: true },
    });
    if (!row?.apiKeyEnc) throw new Error("Add an API key first.");
    const secret = decrypt(row.apiKeyEnc);
    const higgsfield =
      item.provider === "HIGGSFIELD"
        ? higgsfieldEstimateLabel(await estimateHiggsfieldClip(parseHiggsfieldCredentials(secret)))
        : null;
    const message = higgsfield?.message ?? (await probeApiKey(item.provider, secret));
    await prisma.userIntegration.update({
      where: { id: row.id },
      data: {
        status: "CONNECTED",
        plan: higgsfield?.plan,
        accountLabel: higgsfield?.accountLabel,
        lastErrorCode: null,
        lastErrorMessage: null,
        lastErrorAt: null,
      },
    });
    return done(message);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (target && /rejected this API key/i.test(message)) {
      await prisma.userIntegration.updateMany({
        where: { userId: target.userId, provider: target.provider },
        data: {
          status: "INVALID_KEY",
          enabled: false,
          lastErrorCode: "invalid-key",
          lastErrorMessage: message,
          lastErrorAt: new Date(),
        },
      }).catch(() => undefined);
      revalidatePath("/dashboard/integrations");
    }
    return failure(error, "Connection test failed.");
  }
}

export async function addHiggsfieldAccountAction(
  email: string,
  apiKey: string,
): Promise<IntegrationActionResult> {
  try {
    const user = await requireUser();
    const result = await addHiggsfieldAccount(user.id, email, apiKey);
    return done(result.message);
  } catch (error) {
    return failure(error, "Could not connect that Higgsfield account.");
  }
}

export async function setHiggsfieldAccountEnabledAction(
  accountId: string,
  enabled: boolean,
): Promise<IntegrationActionResult> {
  try {
    const user = await requireUser();
    await setHiggsfieldAccountEnabled(user.id, accountId, enabled);
    return done(enabled ? "Higgsfield account enabled." : "Higgsfield account paused.");
  } catch (error) {
    return failure(error, "Could not update that Higgsfield account.");
  }
}

export async function removeHiggsfieldAccountAction(
  accountId: string,
): Promise<IntegrationActionResult> {
  try {
    const user = await requireUser();
    await removeHiggsfieldAccount(user.id, accountId);
    return done("Higgsfield account disconnected.");
  } catch (error) {
    return failure(error, "Could not disconnect that Higgsfield account.");
  }
}
