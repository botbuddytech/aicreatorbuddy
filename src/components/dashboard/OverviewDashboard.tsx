"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { BarList } from "@/components/dashboard/BarList";
import { ExportDurationCard } from "@/components/dashboard/ExportDurationCard";
import { OverviewStatCard } from "@/components/dashboard/OverviewStatCard";
import { PerformanceCharts } from "@/components/dashboard/PerformanceCharts";
import { RecentUploads } from "@/components/dashboard/RecentUploads";
import { ScheduledVideosTable } from "@/components/dashboard/ScheduledVideosTable";
import { ActionButton } from "@/components/ui/ActionButton";
import { chartRangeOptions, type ChartRange } from "@/lib/dashboardContent";
import type { OverviewPayload } from "@/lib/youtube/present";

const TRAFFIC_ICONS: Record<string, string> = {
  "YouTube Search": "⌕",
  Search: "⌕",
  Browse: "▦",
  Suggested: "✦",
  External: "↗",
  Direct: "◎",
  Subscriptions: "★",
  Shorts: "▶",
  Playlists: "≡",
  Notifications: "◌",
  "End screens": "▣",
  "Channel pages": "⌂",
};

function AnalyticsNotice({ message }: { message: string }) {
  const parts = message.split(/(https:\/\/\S+)/);
  return (
    <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
      {parts.map((part, index) =>
        part.startsWith("https://") ? (
          <a key={part} href={part} target="_blank" rel="noreferrer" className="font-semibold text-accent underline">
            Enable YouTube Analytics API
          </a>
        ) : (
          <span key={`${index}-${part.slice(0, 12)}`}>{part}</span>
        ),
      )}
    </p>
  );
}

export function OverviewDashboard({ initial }: { initial: OverviewPayload }) {
  const [range, setRange] = useState<ChartRange>("all");
  const [payload, setPayload] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  async function load(nextRange: ChartRange, refresh = false) {
    const id = ++requestId.current;
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dashboard/youtube?range=${encodeURIComponent(nextRange)}${refresh ? "&refresh=1" : ""}`,
      );
      const body = (await response.json()) as OverviewPayload & { error?: string };
      if (id !== requestId.current) return;
      if (!response.ok) throw new Error(body.error || "Could not load YouTube data.");
      setPayload(body);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : "Could not load YouTube data.");
    } finally {
      if (id === requestId.current) setRefreshing(false);
    }
  }

  function refresh() {
    void load(range, true);
  }

  return (
    <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:items-center sm:justify-end">
        <label className="sr-only" htmlFor="overview-range">
          Date range
        </label>
        <select
          id="overview-range"
          value={range}
          onChange={(event) => {
            const next = event.target.value as ChartRange;
            setRange(next);
            void load(next);
          }}
          className="col-span-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50 sm:col-auto"
        >
          {chartRangeOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <ActionButton variant="secondary" type="button" className="w-full sm:w-auto">
          Export
        </ActionButton>
        <ActionButton
          variant="secondary"
          type="button"
          loading={refreshing}
          loadingLabel="Refreshing…"
          onClick={refresh}
          className="w-full sm:w-auto"
        >
          Refresh
        </ActionButton>
        <Link
          href="/dashboard/create"
          className="col-span-2 inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark sm:col-auto"
        >
          Upload
        </Link>
      </div>

      <ExportDurationCard />

      {!payload.channel ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-5 py-10 text-center">
          <p className="font-display text-lg font-semibold text-foreground">Connect a YouTube channel</p>
          <p className="mt-2 text-sm text-muted">Overview numbers come from the channel selected above.</p>
          <Link
            href="/api/youtube/connect"
            className="mt-4 inline-flex rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
          >
            Connect YouTube
          </Link>
        </div>
      ) : null}

      {payload.channel?.missingScopes ? (
        <p className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          Reconnect YouTube to load watch time, revenue, and traffic.{" "}
          <a href="/api/youtube/connect" className="font-semibold underline">
            Reconnect
          </a>
        </p>
      ) : null}
      {payload.analyticsError ? <AnalyticsNotice message={payload.analyticsError} /> : null}
      {error ? <p className="text-sm text-accent">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {payload.primary.map((stat) => (
          <OverviewStatCard key={stat.id} stat={stat} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {payload.secondary.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">{stat.label}</p>
            <p className="mt-2 font-display text-xl font-semibold text-foreground">{stat.value}</p>
            <p className={`mt-1 text-xs font-semibold ${stat.positive ? "text-success" : "text-chart-amber"}`}>
              {stat.delta}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarList
          title="Traffic sources"
          subtitle="Where viewers find your videos"
          href="/dashboard/analytics"
          emptyLabel="YouTube did not return traffic sources for this range."
          items={payload.traffic.map((item) => ({
            ...item,
            icon: <span aria-hidden>{TRAFFIC_ICONS[item.label] ?? "●"}</span>,
          }))}
        />
        <BarList
          title="Top countries"
          subtitle="Views by geography"
          href="/dashboard/analytics"
          emptyLabel="YouTube did not return country data for this range."
          items={payload.countries.map((item) => ({
            ...item,
            icon: <span aria-hidden>{item.flag}</span>,
          }))}
        />
      </div>

      <RecentUploads uploads={payload.uploads} />
      <ScheduledVideosTable videos={payload.scheduled} />
      <PerformanceCharts
        range={range}
        loading={refreshing}
        onRangeChange={(next) => {
          setRange(next);
          void load(next);
        }}
        series={payload.series}
        audience={payload.audience}
      />
    </div>
  );
}
