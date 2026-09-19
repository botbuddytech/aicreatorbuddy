import type {
  IntegrationConnectionStatus,
  IntegrationProvider,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  INTEGRATION_CATALOG,
  type IntegrationId,
} from "@/lib/integrations/catalog";

export type UserIntegrationState = {
  id: string;
  integrationId: IntegrationId;
  provider: IntegrationProvider;
  authKind: "OAUTH" | "API_KEY" | "NONE";
  connectUrl: string | null;
  keyPrefix: string | null;
  status: IntegrationConnectionStatus;
  enabled: boolean;
  maskedCredential: string | null;
  accountLabel: string | null;
  plan: string | null;
  quotaUsed: number | null;
  quotaLimit: number | null;
  quotaUnit: string | null;
  quotaResetsAt: string | null;
  lastUsedAt: string | null;
  connectedAt: string | null;
  lastErrorMessage: string | null;
  usage: {
    hasData: boolean;
    callsToday: number | null;
    callsMonth: number | null;
    spendMonthUsd: number | null;
    successRate: number | null;
    averageLatencyMs: number | null;
    p95LatencyMs: number | null;
    trend: number[];
    trendDates: string[];
    stepBreakdown: Array<{ label: string; value: number; color: string }>;
    channelBreakdown: Array<{ label: string; value: number; color: string }>;
    endpoints: Array<{
      method: "POST";
      path: string;
      calls: number;
      avgLatency: number;
      errorRate: number;
    }>;
    recentCalls: Array<{
      id: string;
      time: string;
      method: "POST";
      path: string;
      status: number;
      latency: number;
      units: number;
      channel: string;
      step: string;
    }>;
  } | null;
};

const BREAKDOWN_COLORS = [
  "bg-accent",
  "bg-chart-blue",
  "bg-chart-purple",
  "bg-chart-amber",
  "bg-success",
] as const;

async function getVidiqUsage(userId: string): Promise<NonNullable<UserIntegrationState["usage"]>> {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const trendStart = new Date(today);
  trendStart.setUTCDate(trendStart.getUTCDate() - 29);
  const rows = await prisma.integrationUsage.findMany({
    where: { userId, provider: "VIDIQ", at: { gte: trendStart } },
    orderBy: { at: "desc" },
    select: {
      id: true,
      operation: true,
      httpStatus: true,
      ok: true,
      latencyMs: true,
      units: true,
      estimatedUsd: true,
      step: true,
      channelId: true,
      at: true,
    },
  });
  const trendDates = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(trendStart);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  });
  const trend = Array.from({ length: 30 }, () => 0);
  const endpointGroups = new Map<string, typeof rows>();
  const stepGroups = new Map<string, number>();
  const channelGroups = new Map<string, number>();
  const monthRows = rows.filter((row) => row.at >= monthStart);
  const todayRows = rows.filter((row) => row.at >= today);

  for (const row of rows) {
    const day = new Date(Date.UTC(row.at.getUTCFullYear(), row.at.getUTCMonth(), row.at.getUTCDate()));
    const index = Math.floor((day.getTime() - trendStart.getTime()) / 86_400_000);
    if (index >= 0 && index < trend.length) trend[index] += 1;
    endpointGroups.set(row.operation, [...(endpointGroups.get(row.operation) ?? []), row]);
    const step = row.step ?? "Other";
    stepGroups.set(step, (stepGroups.get(step) ?? 0) + 1);
    const channel = row.channelId ?? "No channel";
    channelGroups.set(channel, (channelGroups.get(channel) ?? 0) + 1);
  }

  const latencies = rows
    .flatMap((row) => (row.latencyMs == null ? [] : [row.latencyMs]))
    .sort((a, b) => a - b);
  const p95Index = latencies.length ? Math.ceil(latencies.length * 0.95) - 1 : -1;
  const breakdown = (groups: Map<string, number>) =>
    [...groups.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], index) => ({
        label,
        value,
        color: BREAKDOWN_COLORS[index % BREAKDOWN_COLORS.length],
      }));

  return {
    hasData: rows.length > 0,
    callsToday: rows.length ? todayRows.length : null,
    callsMonth: rows.length ? monthRows.length : null,
    // vidIQ reports credits, not the user's plan price or a dollar amount per call.
    spendMonthUsd: null,
    successRate: rows.length
      ? Math.round((rows.filter((row) => row.ok).length / rows.length) * 1000) / 10
      : null,
    averageLatencyMs: latencies.length
      ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
      : null,
    p95LatencyMs: p95Index >= 0 ? latencies[p95Index] : null,
    trend,
    trendDates,
    stepBreakdown: breakdown(stepGroups),
    channelBreakdown: breakdown(channelGroups),
    endpoints: [...endpointGroups.entries()].map(([path, calls]) => ({
      method: "POST" as const,
      path,
      calls: calls.length,
      avgLatency: calls.some((call) => call.latencyMs != null)
        ? Math.round(
            calls.reduce((sum, call) => sum + (call.latencyMs ?? 0), 0) /
              calls.filter((call) => call.latencyMs != null).length,
          )
        : 0,
      errorRate:
        Math.round((calls.filter((call) => !call.ok).length / calls.length) * 1000) / 10,
    })),
    recentCalls: rows.slice(0, 50).map((row) => ({
      id: row.id,
      time: row.at.toLocaleString(),
      method: "POST" as const,
      path: row.operation,
      status: row.httpStatus ?? (row.ok ? 200 : 500),
      latency: row.latencyMs ?? 0,
      units: row.units,
      channel: row.channelId ?? "—",
      step: row.step ?? "—",
    })),
  };
}

export async function ensureUserIntegrationRows(userId: string): Promise<void> {
  await prisma.userIntegration.createMany({
    data: INTEGRATION_CATALOG.map((item) => ({
      userId,
      provider: item.provider,
      authKind: item.authKind,
      status: item.provider === "REMOTION" ? "CONNECTED" as const : "NOT_CONNECTED" as const,
      enabled: item.provider === "REMOTION",
    })),
    skipDuplicates: true,
  });

  const youtubeChannels = await prisma.youtubeChannel.count({
    where: { userId, status: "ACTIVE" },
  });
  const youtubeIntegration = await prisma.userIntegration.findUnique({
    where: { userId_provider: { userId, provider: "YOUTUBE" } },
    select: { status: true, enabled: true },
  });
  await prisma.userIntegration.update({
    where: { userId_provider: { userId, provider: "YOUTUBE" } },
    data: {
      status: youtubeChannels > 0 ? "CONNECTED" : "NOT_CONNECTED",
      enabled:
        youtubeChannels === 0
          ? false
          : youtubeIntegration?.status === "CONNECTED"
            ? youtubeIntegration.enabled
            : true,
      accountLabel:
        youtubeChannels > 0
          ? `${youtubeChannels} connected channel${youtubeChannels === 1 ? "" : "s"}`
          : null,
    },
  });
}

export async function listUserIntegrations(
  userId: string,
): Promise<UserIntegrationState[]> {
  await ensureUserIntegrationRows(userId);
  const [rows, vidiqUsage] = await Promise.all([
    prisma.userIntegration.findMany({ where: { userId } }),
    getVidiqUsage(userId),
  ]);
  const byProvider = new Map(rows.map((row) => [row.provider, row]));

  return INTEGRATION_CATALOG.map((item) => {
    const row = byProvider.get(item.provider);
    if (!row) throw new Error(`Missing integration row for ${item.provider}`);
    const prefix = item.keyPrefix ?? "";
    return {
      id: row.id,
      integrationId: item.id,
      provider: row.provider,
      authKind: item.authKind,
      connectUrl: item.connectUrl ?? null,
      keyPrefix: item.keyPrefix ?? null,
      status: row.status,
      enabled: row.enabled,
      maskedCredential: row.apiKeyLast4
        ? `${prefix}${"•".repeat(12)}${row.apiKeyLast4}`
        : null,
      accountLabel: row.accountLabel,
      plan: row.plan,
      quotaUsed: row.quotaUsed,
      quotaLimit: row.quotaLimit,
      quotaUnit: row.quotaUnit,
      quotaResetsAt: row.quotaResetsAt?.toISOString() ?? null,
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
      connectedAt:
        row.status === "CONNECTED" || row.status === "NEEDS_REAUTH"
          ? row.createdAt.toISOString()
          : null,
      lastErrorMessage: row.lastErrorMessage,
      usage: item.provider === "VIDIQ" ? vidiqUsage : null,
    };
  });
}
