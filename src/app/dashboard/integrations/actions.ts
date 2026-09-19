"use server";

import { revalidatePath } from "next/cache";
import type { IntegrationProvider } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/session";
import { decrypt, encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { integrationCatalogItem } from "@/lib/integrations/catalog";
import { callVidiqTool } from "@/lib/vidiq/client";

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
    const apiKey = apiKeyInput.trim();
    if (apiKey.length < 8 || apiKey.length > 2048 || /\s/.test(apiKey)) {
      return { ok: false, error: "Enter a valid API key." };
    }
    if (item.keyPrefix && !apiKey.startsWith(item.keyPrefix)) {
      return { ok: false, error: `This key should start with ${item.keyPrefix}.` };
    }

    const message = await probeApiKey(item.provider, apiKey);
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
      },
      update: {
        authKind: "API_KEY",
        status: "CONNECTED",
        enabled: true,
        apiKeyEnc: encrypt(apiKey),
        apiKeyLast4: apiKey.slice(-4),
        apiKeyAddedAt: new Date(),
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
    if (item.authKind === "NONE") return done("Local integration is available.");

    const row = await prisma.userIntegration.findUnique({
      where: { userId_provider: { userId: user.id, provider: item.provider } },
      select: { id: true, apiKeyEnc: true },
    });
    if (!row?.apiKeyEnc) throw new Error("Add an API key first.");
    const message = await probeApiKey(item.provider, decrypt(row.apiKeyEnc));
    await prisma.userIntegration.update({
      where: { id: row.id },
      data: {
        status: "CONNECTED",
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
