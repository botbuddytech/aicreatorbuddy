"use client";

import { useMemo, useState } from "react";
import { BarList } from "@/components/dashboard/BarList";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import {
  barItems,
  donutSegments,
  type TrafficData,
} from "@/lib/channelAnalyticsContent";
import { DeviceBreakdown } from "../widgets/DeviceBreakdown";
import { GeoList } from "../widgets/GeoList";
import { MiniSpark } from "../widgets/MiniSpark";
import { Panel } from "../widgets/Panel";
import { SimpleTable } from "../widgets/SimpleTable";
import { StatGrid } from "../widgets/StatGrid";
import { TrendLineChart } from "../widgets/TrendLineChart";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "search", label: "YouTube Search" },
  { id: "suggested", label: "Suggested" },
  { id: "external", label: "External" },
  { id: "browse", label: "Browse features" },
];

export function TrafficSection({ data }: { data: TrafficData }) {
  const [tab, setTab] = useState("overview");
  const [grain, setGrain] = useState("weekly");
  const [query, setQuery] = useState("");

  const trend =
    grain === "daily" ? data.trendDaily : grain === "monthly" ? data.trendMonthly : data.trendWeekly;

  const filteredSources = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data.topSources;
    return data.topSources.filter((row) => row.label.toLowerCase().includes(needle));
  }, [data.topSources, query]);

  const searchFiltered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data.searchTerms;
    return data.searchTerms.filter((row) => row.term.toLowerCase().includes(needle));
  }, [data.searchTerms, query]);

  return (
    <div className="space-y-4">
      <StatGrid stats={data.stats} tones={["success", "blue", "purple", "accent"]} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search sources…"
          className="glass-field w-full rounded-xl border border-white/12 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted/70 focus:border-accent/50 sm:max-w-xs"
        />
      </div>

      {tab === "overview" ? (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-5">
            <DonutChart
              title="Traffic distribution"
              total="100%"
              segments={donutSegments(data.distribution)}
              formatValue={(value) => `${value}%`}
              totalCaption="mix"
            />
            <Panel className="xl:col-span-3" title="Top traffic sources">
              <SimpleTable
                columns={[
                  { key: "source", label: "Source" },
                  { key: "views", label: "Views", align: "right" },
                  { key: "watch", label: "Watch time", align: "right" },
                  { key: "ctr", label: "CTR", align: "right" },
                  { key: "delta", label: "Trend", align: "right" },
                ]}
                rows={filteredSources.map((row) => ({
                  source: (
                    <div>
                      <p className="font-medium text-foreground">{row.label}</p>
                      <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-surface-soft">
                        <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.share}%` }} />
                      </div>
                    </div>
                  ),
                  views: row.views,
                  watch: row.watchTime,
                  ctr: row.ctr,
                  delta: (
                    <span className={row.positive ? "text-success" : "text-chart-amber"}>{row.delta}</span>
                  ),
                }))}
              />
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <Panel
              className="xl:col-span-3"
              title="Traffic trend"
              action={
                <Tabs
                  tabs={[
                    { id: "daily", label: "Daily" },
                    { id: "weekly", label: "Weekly" },
                    { id: "monthly", label: "Monthly" },
                  ]}
                  value={grain}
                  onChange={setGrain}
                />
              }
            >
              <TrendLineChart data={trend} />
            </Panel>
            <div className="xl:col-span-2">
              <GeoList rows={data.geo} title="Geographic distribution" subtitle="Top countries by views" />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Top search terms" action={<Badge tone="accent">AI insights</Badge>}>
              <SimpleTable
                columns={[
                  { key: "term", label: "Search term" },
                  { key: "views", label: "Views", align: "right" },
                  { key: "ctr", label: "CTR", align: "right" },
                  { key: "trend", label: "Trend", align: "right" },
                ]}
                rows={searchFiltered.map((row) => ({
                  term: (
                    <span className="inline-flex items-center gap-2">
                      {row.term}
                      {row.hot ? <Badge tone="accent" size="sm">Hot</Badge> : null}
                    </span>
                  ),
                  views: row.views,
                  ctr: (
                    <span className={row.ctrPositive ? "text-success" : "text-chart-amber"}>{row.ctr}</span>
                  ),
                  trend: <MiniSpark values={row.trend} up={row.trendUp} />,
                }))}
              />
            </Panel>
            <Panel title="External sources">
              <SimpleTable
                columns={[
                  { key: "source", label: "Source" },
                  { key: "views", label: "Views", align: "right" },
                  { key: "watch", label: "Watch time", align: "right" },
                  { key: "trend", label: "Trend", align: "right" },
                ]}
                rows={data.external.map((row) => ({
                  source: row.source,
                  views: row.views,
                  watch: row.watchTime,
                  trend: (
                    <span className={row.trendUp ? "text-success" : "text-chart-amber"}>
                      {row.trendUp ? "Up" : "Down"}
                    </span>
                  ),
                }))}
              />
            </Panel>
          </div>

          <DeviceBreakdown data={data.devices} />
          <div className="grid gap-4 lg:grid-cols-2">
            <BarList title="Operating system" items={barItems(data.devices.os)} />
            <BarList title="Playback location" items={barItems(data.devices.playback)} />
          </div>
        </div>
      ) : null}

      {tab === "search" ? (
        <Panel title="YouTube Search">
          <SimpleTable
            columns={[
              { key: "term", label: "Query" },
              { key: "views", label: "Views", align: "right" },
              { key: "ctr", label: "CTR", align: "right" },
              { key: "trend", label: "Trend", align: "right" },
            ]}
            rows={searchFiltered.map((row) => ({
              term: row.term,
              views: row.views,
              ctr: row.ctr,
              trend: <MiniSpark values={row.trend} up={row.trendUp} />,
            }))}
          />
        </Panel>
      ) : null}

      {tab === "suggested" ? (
        <Panel title="Suggested videos">
          <p className="mb-4 text-sm text-muted">
            Suggested traffic is {data.distribution.find((item) => item.label.includes("Suggested"))?.value ?? 24}% of
            views this period.
          </p>
          <TrendLineChart data={data.trendWeekly} />
        </Panel>
      ) : null}

      {tab === "external" ? (
        <Panel title="External sources">
          <SimpleTable
            columns={[
              { key: "source", label: "Source" },
              { key: "views", label: "Views", align: "right" },
              { key: "watch", label: "Watch time", align: "right" },
            ]}
            rows={data.external.map((row) => ({
              source: row.source,
              views: row.views,
              watch: row.watchTime,
            }))}
          />
        </Panel>
      ) : null}

      {tab === "browse" ? (
        <Panel title="Browse features">
          <BarList
            title="Browse mix"
            items={barItems(data.distribution.filter((item) => /browse|direct|playlist/i.test(item.label)))}
          />
        </Panel>
      ) : null}
    </div>
  );
}
