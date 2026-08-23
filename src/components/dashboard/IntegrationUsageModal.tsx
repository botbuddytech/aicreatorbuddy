"use client";

import { useMemo, useState } from "react";
import { BarList } from "@/components/dashboard/BarList";
import { UsageTrendChart } from "@/components/dashboard/UsageTrendChart";
import { Modal } from "@/components/ui/Modal";
import {
  INTEGRATION_STATUS_LABEL,
  INTEGRATION_STATUS_PILL,
  INTEGRATION_TREND_DATES,
  formatCount,
  formatInt,
  formatLatency,
  formatUsd,
  quotaPercent,
  sumTrend,
  type Integration,
  type IntegrationCallLog,
} from "@/lib/dashboardContent";

type UsageTab = "overview" | "usage" | "logs";
type LogFilter = "all" | "2xx" | "4xx" | "5xx";

const TABS: { id: UsageTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "usage", label: "Usage" },
  { id: "logs", label: "Logs" },
];

const LOG_FILTERS: { id: LogFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "2xx", label: "2xx" },
  { id: "4xx", label: "4xx" },
  { id: "5xx", label: "5xx" },
];

function matchesLogFilter(status: number, filter: LogFilter): boolean {
  if (filter === "all") return true;
  if (filter === "2xx") return status >= 200 && status < 300;
  if (filter === "4xx") return status >= 400 && status < 500;
  return status >= 500;
}

function statusPillClass(status: number): string {
  if (status >= 500) return "bg-accent/15 text-accent";
  if (status >= 400) return "bg-chart-amber/15 text-chart-amber";
  return "bg-success/15 text-success";
}

function QuotaBar({ integration }: { integration: Integration }) {
  const percent = quotaPercent(integration.quota);
  const barColor =
    percent >= 90 ? "bg-accent" : percent >= 75 ? "bg-chart-amber" : "bg-success";

  return (
    <div className="rounded-xl border border-border bg-surface-soft p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="font-medium text-foreground">Quota</p>
        <p className="text-muted">
          {formatInt(integration.quota.used)} / {formatInt(integration.quota.limit)}{" "}
          {integration.quota.unit}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          {percent.toFixed(0)}% of {integration.quota.window.toLowerCase()} window
        </span>
        <span>Resets {integration.quota.resetsOn}</span>
      </div>
    </div>
  );
}

function DisconnectedEmptyState({ note }: { note: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface-soft px-5 py-10 text-center">
      <p className="font-display text-lg font-semibold text-foreground">Not connected</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
        {note} Usage, spend, and request logs will appear here after the first successful call.
      </p>
    </div>
  );
}

function OverviewTab({ integration }: { integration: Integration }) {
  const calls = sumTrend(integration.trend);
  const meta = [
    { label: "Plan", value: integration.plan },
    { label: "Environment", value: integration.environment },
    { label: "Owner", value: integration.owner },
    { label: "Key created", value: integration.keyCreated },
  ];
  const stats = [
    { label: "Calls MTD", value: formatInt(calls) },
    { label: "Spend MTD", value: formatUsd(integration.cost.monthToDate) },
    { label: "Success rate", value: `${integration.health.successRate}%` },
    { label: "p95 latency", value: formatLatency(integration.health.p95Latency) },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted">{integration.statusNote}</p>
      <dl className="grid gap-3 sm:grid-cols-2">
        {meta.map((item) => (
          <div key={item.label} className="rounded-xl bg-surface-soft px-4 py-3">
            <dt className="text-xs text-muted">{item.label}</dt>
            <dd className="mt-1 truncate text-sm font-medium text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>
      <QuotaBar integration={integration} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-surface-soft px-4 py-3">
            <p className="text-xs text-muted">{item.label}</p>
            <p className="mt-1 font-display text-xl font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Scopes</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {integration.scopes.map((scope) => (
            <span
              key={scope}
              className="rounded-full border border-border bg-surface-soft px-2.5 py-1 text-[11px] font-medium text-muted"
            >
              {scope}
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
              <th className="pb-3 font-medium">Method</th>
              <th className="pb-3 font-medium">Endpoint</th>
              <th className="pb-3 font-medium">Calls</th>
              <th className="pb-3 font-medium">Avg latency</th>
              <th className="pb-3 font-medium">Error rate</th>
            </tr>
          </thead>
          <tbody>
            {integration.endpoints.map((endpoint) => (
              <tr key={`${endpoint.method}-${endpoint.path}`} className="border-b border-border/60 last:border-0">
                <td className="py-3">
                  <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                    {endpoint.method}
                  </span>
                </td>
                <td className="py-3 font-mono text-xs text-muted">{endpoint.path}</td>
                <td className="py-3 text-foreground">{formatInt(endpoint.calls)}</td>
                <td className="py-3 text-muted">{formatLatency(endpoint.avgLatency)}</td>
                <td className="py-3 text-muted">{endpoint.errorRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsageTab({ integration }: { integration: Integration }) {
  if (integration.status === "disconnected") {
    return <DisconnectedEmptyState note={integration.statusNote} />;
  }

  return (
    <div className="space-y-4">
      <UsageTrendChart values={integration.trend} dates={INTEGRATION_TREND_DATES} />
      <div className="grid gap-4 lg:grid-cols-2">
        <BarList
          title="By pipeline step"
          items={integration.stepBreakdown}
          formatValue={(value) => formatInt(value)}
        />
        <BarList
          title="By channel"
          items={integration.channelBreakdown}
          formatValue={(value) => formatInt(value)}
        />
      </div>
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-display text-lg font-semibold text-foreground">Cost this month</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-surface-soft px-4 py-3">
            <p className="text-xs text-muted">Month to date</p>
            <p className="mt-1 font-display text-xl font-semibold text-foreground">
              {formatUsd(integration.cost.monthToDate)}
            </p>
          </div>
          <div className="rounded-xl bg-surface-soft px-4 py-3">
            <p className="text-xs text-muted">Projected</p>
            <p className="mt-1 font-display text-xl font-semibold text-foreground">
              {formatUsd(integration.cost.projected)}
            </p>
          </div>
          <div className="rounded-xl bg-surface-soft px-4 py-3">
            <p className="text-xs text-muted">Rate</p>
            <p className="mt-1 text-sm font-medium text-foreground">{integration.cost.perUnitLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogsTab({
  calls,
  disconnected,
  note,
}: {
  calls: readonly IntegrationCallLog[];
  disconnected: boolean;
  note: string;
}) {
  const [filter, setFilter] = useState<LogFilter>("all");
  const filtered = useMemo(
    () => calls.filter((call) => matchesLogFilter(call.status, filter)),
    [calls, filter],
  );

  if (disconnected) {
    return <DisconnectedEmptyState note={note} />;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {LOG_FILTERS.map((item) => {
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                active
                  ? "bg-accent/15 text-accent"
                  : "border border-border text-muted hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
              <th className="pb-3 font-medium">Time</th>
              <th className="pb-3 font-medium">Request</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Latency</th>
              <th className="pb-3 font-medium">Units</th>
              <th className="pb-3 font-medium">Channel</th>
              <th className="pb-3 font-medium">Step</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-muted">
                  No requests match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((call) => (
                <tr key={call.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3 text-muted">{call.time}</td>
                  <td className="py-3">
                    <span className="mr-2 rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                      {call.method}
                    </span>
                    <span className="font-mono text-xs text-muted">{call.path}</span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusPillClass(call.status)}`}
                    >
                      {call.status}
                    </span>
                  </td>
                  <td className="py-3 text-muted">{formatLatency(call.latency)}</td>
                  <td className="py-3 text-muted">{formatCount(call.units)}</td>
                  <td className="py-3 text-foreground">{call.channel}</td>
                  <td className="py-3 text-muted">{call.step}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsageModalBody({
  integration,
  onClose,
}: {
  integration: Integration;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<UsageTab>("overview");

  return (
    <Modal
      open
      title={integration.name}
      subtitle={integration.category}
      size="xl"
      onClose={onClose}
      header={
        <div className="pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${INTEGRATION_STATUS_PILL[integration.status]}`}
            >
              {INTEGRATION_STATUS_LABEL[integration.status]}
            </span>
            <span className="text-xs text-muted">{integration.plan}</span>
            <span className="text-xs text-muted">·</span>
            <span className="text-xs text-muted">{integration.environment}</span>
          </div>
          <div className="mt-4 flex gap-1 border-b border-border">
            {TABS.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${
                    active
                      ? "border-accent text-foreground"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      }
    >
      {tab === "overview" ? <OverviewTab integration={integration} /> : null}
      {tab === "usage" ? <UsageTab integration={integration} /> : null}
      {tab === "logs" ? (
        <LogsTab
          calls={integration.recentCalls}
          disconnected={integration.status === "disconnected"}
          note={integration.statusNote}
        />
      ) : null}
    </Modal>
  );
}

export function IntegrationUsageModal({
  integration,
  onClose,
}: {
  integration: Integration | null;
  onClose: () => void;
}) {
  if (!integration) return null;
  return <UsageModalBody key={integration.id} integration={integration} onClose={onClose} />;
}
