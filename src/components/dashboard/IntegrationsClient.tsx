"use client";

import { useState } from "react";
import { BarList } from "@/components/dashboard/BarList";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { IntegrationCard } from "@/components/dashboard/IntegrationCard";
import { IntegrationUsageModal } from "@/components/dashboard/IntegrationUsageModal";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  formatInt,
  formatUsd,
  integrationNeedsAttention,
  integrations,
  sumTrend,
  type Integration,
} from "@/lib/dashboardContent";
import type { UserIntegrationState } from "@/lib/integrations/repo";

type FilterId = "all" | "connected" | "attention" | "disconnected";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "connected", label: "Connected" },
  { id: "attention", label: "Needs attention" },
  { id: "disconnected", label: "Disconnected" },
];

function matchesFilter(integration: Integration, filter: FilterId): boolean {
  if (filter === "connected") return integration.connected;
  if (filter === "attention") return integrationNeedsAttention(integration);
  if (filter === "disconnected") return !integration.connected;
  return true;
}

function statusFor(state: UserIntegrationState): Integration["status"] {
  if (state.status === "CONNECTED") return "operational";
  if (state.status === "NEEDS_REAUTH" || state.status === "INVALID_KEY") return "degraded";
  return "disconnected";
}

export function IntegrationsClient({
  integrationStates,
}: {
  integrationStates: UserIntegrationState[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  const stateById = new Map(integrationStates.map((state) => [state.integrationId, state]));
  const displayIntegrations = integrations.map((item) => {
    const state = stateById.get(item.id as UserIntegrationState["integrationId"]);
    if (!state) return item;
    const hasQuota = state.quotaLimit != null && state.quotaLimit > 0;
    const liveItem = {
      ...item,
      connected: state.status === "CONNECTED",
      maskedKey: state.maskedCredential ?? "No credential connected",
      revealedKey: "",
      lastUsed: state.lastUsedAt ? new Date(state.lastUsedAt).toLocaleString() : "Never",
      owner: state.accountLabel ?? "Current user",
      plan: state.plan ?? (state.status === "CONNECTED" ? "Connected" : "Not connected"),
      status: statusFor(state),
      statusNote: state.lastErrorMessage ?? (state.enabled ? "Enabled" : "Disabled"),
      quota: hasQuota
        ? {
            used: state.quotaUsed ?? 0,
            limit: state.quotaLimit ?? 0,
            unit: state.quotaUnit ?? "units",
            resetsOn: state.quotaResetsAt
              ? new Date(state.quotaResetsAt).toLocaleString()
              : "—",
            window: "Current period",
          }
        : {
            used: 0,
            limit: 0,
            unit: state.status === "CONNECTED" ? "usage unavailable" : "not connected",
            resetsOn: "—",
            window: "—",
          },
    } satisfies Integration;
    if (state.integrationId !== "vidiq") return liveItem;

    const usage = state.usage;
    return {
      ...liveItem,
      keyCreated: state.connectedAt
        ? new Date(state.connectedAt).toLocaleDateString()
        : "—",
      scopes: state.status === "CONNECTED" ? ["api"] : [],
      trend: usage?.trend ?? [],
      cost: {
        monthToDate: 0,
        projected: 0,
        perUnitLabel: "Not reported by vidIQ",
        currency: "USD",
      },
      health: {
        successRate: usage?.successRate ?? 0,
        errorRate: usage?.successRate == null ? 0 : 100 - usage.successRate,
        p95Latency: usage?.p95LatencyMs ?? 0,
        avgLatency: usage?.averageLatencyMs ?? 0,
        rateLimitEvents: usage?.recentCalls.filter((call) => call.status === 429).length ?? 0,
        uptime: 0,
      },
      stepBreakdown: usage?.stepBreakdown ?? [],
      channelBreakdown: usage?.channelBreakdown ?? [],
      endpoints: usage?.endpoints ?? [],
      recentCalls: usage?.recentCalls ?? [],
    } satisfies Integration;
  });

  const totalCalls = displayIntegrations.reduce((acc, item) => acc + sumTrend(item.trend), 0);
  const totalSpend = displayIntegrations.reduce((acc, item) => acc + item.cost.monthToDate, 0);
  const connected = displayIntegrations.filter((item) => item.connected);
  const connectedWithHealth = connected.filter((item) => {
    const state = stateById.get(item.id as UserIntegrationState["integrationId"]);
    return state?.integrationId !== "vidiq" || state.usage?.successRate != null;
  });
  const avgSuccess =
    connectedWithHealth.length === 0
      ? 0
      : connectedWithHealth.reduce((acc, item) => acc + item.health.successRate, 0) /
        connectedWithHealth.length;

  const spendSegments = displayIntegrations
    .filter((item) => item.cost.monthToDate > 0)
    .map((item) => ({
      label: item.name,
      value: item.cost.monthToDate,
      color: item.chartColor,
    }));

  const visible = (() => {
    const needle = query.trim().toLowerCase();
    return displayIntegrations.filter((item) => {
      if (!matchesFilter(item, filter)) return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        item.category.toLowerCase().includes(needle) ||
        item.description.toLowerCase().includes(needle)
      );
    });
  })();

  const active = displayIntegrations.find((item) => item.id === activeId) ?? null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="API calls MTD"
          value={formatInt(totalCalls)}
          delta="+18%"
          positive
          accentClass="from-accent/25"
        />
        <StatCard
          label="Spend MTD"
          value={formatUsd(totalSpend)}
          delta="+9%"
          positive
          accentClass="from-chart-amber/25"
        />
        <StatCard
          label="Avg. success rate"
          value={`${avgSuccess.toFixed(1)}%`}
          delta="-0.4%"
          positive={false}
          accentClass="from-success/25"
        />
        <StatCard
          label="Connected"
          value={`${connected.length} / ${integrations.length}`}
          delta="0%"
          positive
          accentClass="from-chart-blue/25"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search integrations…"
          className="glass-field w-full rounded-xl border border-white/12 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted/70 focus:border-accent/50 sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => {
            const activeChip = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  activeChip
                    ? "bg-accent/15 text-accent"
                    : "border border-border text-muted hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-5 py-12 text-center text-sm text-muted">
          No integrations match this filter.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <IntegrationCard
              key={item.id}
              integration={item}
              liveState={stateById.get(item.id as UserIntegrationState["integrationId"]) ?? null}
              onViewUsage={() => setActiveId(item.id)}
            />
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <DonutChart
          title="Usage across integrations"
          subtitle="Share of month-to-date spend by provider"
          total={formatUsd(totalSpend)}
          segments={spendSegments}
          formatValue={formatUsd}
          totalCaption="MTD spend"
          summaries={[
            { label: "Providers billing", value: String(spendSegments.length) },
            { label: "Projected", value: formatUsd(displayIntegrations.reduce((acc, item) => acc + item.cost.projected, 0)) },
          ]}
        />
        <BarList
          title="Calls by provider"
          items={displayIntegrations.map((item) => ({
            label: item.name,
            value: sumTrend(item.trend),
            color: item.color,
          }))}
          formatValue={(value) => formatInt(value)}
        />
      </div>

      <IntegrationUsageModal
        integration={active}
        liveState={
          active
            ? stateById.get(active.id as UserIntegrationState["integrationId"]) ?? null
            : null
        }
        onClose={() => setActiveId(null)}
      />
    </>
  );
}
