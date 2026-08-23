"use client";

import { useState } from "react";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { MiniSpark } from "@/components/dashboard/channel-analytics/widgets/MiniSpark";
import { Panel } from "@/components/dashboard/channel-analytics/widgets/Panel";
import { SimpleTable } from "@/components/dashboard/channel-analytics/widgets/SimpleTable";
import { TrendLineChart } from "@/components/dashboard/channel-analytics/widgets/TrendLineChart";
import { donutSegments, type RpmCpmData } from "@/lib/monetizationContent";
import { ProgressStatCard } from "../widgets/ProgressStatCard";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "compare", label: "RPM vs CPM" },
  { id: "videos", label: "By Video" },
  { id: "trends", label: "Trends" },
];

const RANGE = [
  { id: "7", label: "7D" },
  { id: "28", label: "28D" },
  { id: "90", label: "90D" },
];

const tones = ["success", "purple", "accent", "blue"] as const;

export function RpmCpmSection({ data }: { data: RpmCpmData }) {
  const [tab, setTab] = useState("overview");
  const [range, setRange] = useState("28");

  const trend = range === "7" ? data.trend7 : range === "90" ? data.trend90 : data.trend28;

  return (
    <div className="space-y-4">
      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "overview" || tab === "compare" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.cards.map((stat, index) => (
            <ProgressStatCard key={stat.label} stat={stat} tone={tones[index] ?? "accent"} />
          ))}
        </div>
      ) : null}

      {tab === "overview" || tab === "compare" || tab === "trends" ? (
        <div className="grid gap-4 xl:grid-cols-5">
          <Panel
            className="xl:col-span-3"
            title="RPM & CPM trends"
            subtitle="Revenue metrics over time"
            action={<Tabs tabs={RANGE} value={range} onChange={setRange} />}
          >
            <TrendLineChart data={trend} />
          </Panel>
          <DonutChart
            title="Revenue breakdown"
            subtitle="By source"
            total="100%"
            totalCaption="mix"
            segments={donutSegments(data.breakdown)}
            formatValue={(value) => `${value}%`}
          />
        </div>
      ) : null}

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {data.insights.map((insight) => (
            <div key={insight.title} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-sm font-semibold text-foreground">{insight.title}</h3>
                <Badge tone="accent" size="sm">
                  {insight.badge}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{insight.body}</p>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "overview" || tab === "videos" ? (
        <Panel title="Top RPM videos" subtitle="Highest revenue per thousand views">
          <SimpleTable
            columns={[
              { key: "video", label: "Video" },
              { key: "rpm", label: "RPM", align: "right" },
              { key: "cpm", label: "CPM", align: "right" },
              { key: "revenue", label: "Revenue", align: "right" },
              { key: "views", label: "Views", align: "right" },
              { key: "trend", label: "Trend", align: "right" },
            ]}
            rows={data.topRpmVideos.map((video) => ({
              video: (
                <div>
                  <p className="font-medium text-foreground">{video.title}</p>
                  <p className="text-xs text-muted">{video.published}</p>
                </div>
              ),
              rpm: <span className="font-semibold text-success">{video.rpm}</span>,
              cpm: <span className="font-semibold text-chart-purple">{video.cpm}</span>,
              revenue: video.revenue,
              views: video.views,
              trend: <MiniSpark values={video.trend} up={video.trendUp} />,
            }))}
          />
        </Panel>
      ) : null}
    </div>
  );
}
