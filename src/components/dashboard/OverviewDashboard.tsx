"use client";

import { useState } from "react";
import Link from "next/link";
import { BarList } from "@/components/dashboard/BarList";
import { OverviewStatCard } from "@/components/dashboard/OverviewStatCard";
import { PerformanceCharts } from "@/components/dashboard/PerformanceCharts";
import { RecentUploads } from "@/components/dashboard/RecentUploads";
import { ScheduledVideosTable } from "@/components/dashboard/ScheduledVideosTable";
import { ActionButton } from "@/components/ui/ActionButton";
import {
  chartRangeOptions,
  overviewPrimaryStats,
  overviewSecondaryStats,
  topCountries,
  trafficSources,
  type ChartRange,
} from "@/lib/dashboardContent";

const TRAFFIC_ICONS: Record<string, string> = {
  Search: "⌕",
  Browse: "▦",
  Suggested: "✦",
  External: "↗",
  Direct: "◎",
};

export function OverviewDashboard() {
  const [range, setRange] = useState<ChartRange>("28d");
  const [refreshing, setRefreshing] = useState(false);

  function refresh() {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 700);
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
          onChange={(event) => setRange(event.target.value as ChartRange)}
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overviewPrimaryStats.map((stat) => (
          <OverviewStatCard key={stat.id} stat={stat} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {overviewSecondaryStats.map((stat) => (
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
          items={trafficSources.map((item) => ({
            ...item,
            icon: <span aria-hidden>{TRAFFIC_ICONS[item.label] ?? "●"}</span>,
          }))}
        />
        <BarList
          title="Top countries"
          subtitle="Views by geography"
          href="/dashboard/analytics"
          items={topCountries.map((item) => ({
            ...item,
            icon: <span aria-hidden>{item.flag}</span>,
          }))}
        />
      </div>

      <RecentUploads />
      <ScheduledVideosTable />
      <PerformanceCharts range={range} onRangeChange={setRange} />
    </div>
  );
}
