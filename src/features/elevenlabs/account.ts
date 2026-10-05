import "server-only";

import { ElevenLabsConfigError, getElevenLabsClient } from "@/features/elevenlabs/client";
import { elevenLabsErrorResponse } from "@/features/elevenlabs/errors";

export type ElevenLabsDayUsage = {
  date: string;
  calls: number;
  spendUsd: number;
};

export type ElevenLabsSnapshot = {
  configured: boolean;
  ok: boolean;
  error: string | null;
  tier: string | null;
  characterCount: number | null;
  characterLimit: number | null;
  quotaError: string | null;
  resetsAt: string | null;
  accountCreatedAt: string | null;
  callsToday: number | null;
  spendMonthUsd: number;
  daily: ElevenLabsDayUsage[];
};

const CACHE_MS = 60_000;
let cached: { at: number; value: ElevenLabsSnapshot } | null = null;

export async function getElevenLabsSnapshot(options?: {
  fresh?: boolean;
}): Promise<ElevenLabsSnapshot> {
  if (!options?.fresh && cached && Date.now() - cached.at < CACHE_MS) {
    return cached.value;
  }
  const value = await loadSnapshot();
  cached = { at: Date.now(), value };
  return value;
}

async function loadSnapshot(): Promise<ElevenLabsSnapshot> {
  const empty = emptySnapshot(Boolean(process.env.ELEVEN_LABS_API_KEY?.trim()));
  if (!empty.configured) {
    return { ...empty, error: "ELEVEN_LABS_API_KEY is not configured." };
  }

  try {
    const client = getElevenLabsClient();
    const subscriptionResult = await client.user.subscription.get().catch((error: unknown) => error);
    const subscription = isSubscription(subscriptionResult) ? subscriptionResult : null;
    const quotaError = subscription ? null : elevenLabsErrorResponse(subscriptionResult).message;
    const usage = await loadDailyUsage(null);
    const resetsMs = subscription ? unixToMs(subscription.nextCharacterCountResetUnix) : null;
    return {
      configured: true,
      ok: true,
      error: null,
      tier: subscription?.tier || null,
      characterCount: finite(subscription?.characterCount),
      characterLimit: finite(subscription?.characterLimit),
      quotaError,
      resetsAt: resetsMs ? new Date(resetsMs).toISOString() : null,
      accountCreatedAt: null,
      callsToday: usage.callsToday,
      spendMonthUsd: usage.spendMonthUsd,
      daily: usage.daily,
    };
  } catch (error) {
    if (error instanceof ElevenLabsConfigError) {
      return { ...empty, configured: false, error: "ELEVEN_LABS_API_KEY is not configured." };
    }
    return { ...empty, error: elevenLabsErrorResponse(error).message };
  }
}

function isSubscription(value: unknown): value is {
  tier: string;
  characterCount: number;
  characterLimit: number;
  nextCharacterCountResetUnix?: number;
} {
  return Boolean(
    value &&
      typeof value === "object" &&
      "characterLimit" in value &&
      "characterCount" in value,
  );
}

async function loadDailyUsage(createdMs: number | null): Promise<{
  daily: ElevenLabsDayUsage[];
  callsToday: number | null;
  spendMonthUsd: number;
}> {
  const client = getElevenLabsClient();
  const end = endOfUtcDay(Date.now());
  const start = startOfUtcDay(createdMs && createdMs > 0 ? createdMs : Date.UTC(2024, 0, 1));
  const request = {
    startUnix: start,
    endUnix: end,
    breakdownType: "none" as const,
    aggregationInterval: "day" as const,
    includeWorkspaceMetrics: false,
  };
  const [calls, spend] = await Promise.all([
    client.usage.get({ ...request, metric: "request_count" }),
    client.usage.get({ ...request, metric: "fiat_units_spent" }).catch(() => null),
  ]);

  const byDay = new Map<string, ElevenLabsDayUsage>();
  applySeries(byDay, calls.time, calls.usage, "calls");
  if (spend) applySeries(byDay, spend.time, spend.usage, "spendUsd");

  const daily = trimLeadingEmptyDays(
    [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
  );
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const todayRow = daily.find((row) => row.date === today);
  return {
    daily,
    callsToday: todayRow ? todayRow.calls : daily.length ? 0 : null,
    spendMonthUsd: roundUsd(
      daily
        .filter((row) => row.date.startsWith(month))
        .reduce((sum, row) => sum + row.spendUsd, 0),
    ),
  };
}

function applySeries(
  byDay: Map<string, ElevenLabsDayUsage>,
  time: number[],
  usage: Record<string, number[]>,
  field: "calls" | "spendUsd",
) {
  time.forEach((stamp, index) => {
    const ms = unixToMs(stamp);
    if (!ms) return;
    const date = new Date(ms).toISOString().slice(0, 10);
    const value = Object.values(usage).reduce((sum, series) => sum + (series[index] ?? 0), 0);
    const row = byDay.get(date) ?? { date, calls: 0, spendUsd: 0 };
    row[field] = field === "spendUsd" ? roundUsd(value) : Math.round(value);
    byDay.set(date, row);
  });
}

function emptySnapshot(configured: boolean): ElevenLabsSnapshot {
  return {
    configured,
    ok: false,
    error: null,
    tier: null,
    characterCount: null,
    characterLimit: null,
    quotaError: null,
    resetsAt: null,
    accountCreatedAt: null,
    callsToday: null,
    spendMonthUsd: 0,
    daily: [],
  };
}

function trimLeadingEmptyDays(daily: ElevenLabsDayUsage[]): ElevenLabsDayUsage[] {
  const first = daily.findIndex((row) => row.calls > 0 || row.spendUsd > 0);
  if (first === -1) return daily.slice(-30);
  return daily.slice(first);
}

function finite(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function unixToMs(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value < 1_000_000_000_000 ? value * 1000 : value;
}

function startOfUtcDay(ms: number): number {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function endOfUtcDay(ms: number): number {
  return startOfUtcDay(ms) + 86_400_000 - 1;
}

function roundUsd(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100) / 100;
}
