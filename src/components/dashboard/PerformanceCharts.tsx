"use client";

import { useMemo, useState } from "react";
import { AudienceCard } from "@/components/dashboard/AudienceCard";
import { Tabs } from "@/components/ui/Tabs";
import { chartRangeOptions, type ChartMetric, type ChartRange } from "@/lib/dashboardContent";
import type { OverviewPayload } from "@/lib/youtube/present";

const METRIC_TABS: { id: ChartMetric; label: string }[] = [
  { id: "views", label: "Views" },
  { id: "engagement", label: "Engagement" },
  { id: "revenue", label: "Revenue" },
];

function formatAxis(metric: ChartMetric, value: number): string {
  if (metric === "revenue") {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${Math.round(value)}`;
  }
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  return String(value);
}

function AreaChart({
  labels,
  values,
  metric,
}: {
  labels: string[];
  values: number[];
  metric: ChartMetric;
}) {
  const width = 640;
  const height = 220;
  const pad = { top: 16, right: 8, bottom: 28, left: 44 };
  const max = Math.max(...values, 1);
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const coords = values.map((value, index) => {
    const x =
      pad.left + (values.length <= 1 ? innerW / 2 : (index / (values.length - 1)) * innerW);
    const y = pad.top + innerH - (value / max) * innerH;
    return { x, y };
  });
  const line = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
  const last = coords[coords.length - 1];
  const first = coords[0];
  const area =
    first && last
      ? `${line} L${last.x} ${pad.top + innerH} L${first.x} ${pad.top + innerH} Z`
      : "";
  const ticks = [0, 0.5, 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" role="img" aria-label={`${metric} over time`}>
      {ticks.map((tick) => {
        const y = pad.top + innerH - tick * innerH;
        return (
          <g key={tick}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y}
              y2={y}
              stroke="currentColor"
              className="text-border"
              strokeWidth="1"
            />
            <text
              x={pad.left - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-muted text-[10px]"
            >
              {formatAxis(metric, max * tick)}
            </text>
          </g>
        );
      })}
      <path d={area} className="fill-accent/20" />
      <path d={line} fill="none" className="stroke-accent" strokeWidth="2.25" strokeLinejoin="round" />
      {coords.map((point, index) => (
        <circle key={labels[index] ?? index} cx={point.x} cy={point.y} r="3" className="fill-accent" />
      ))}
      {coords.map((point, index) => (
        <text
          key={`l-${labels[index] ?? index}`}
          x={point.x}
          y={height - 8}
          textAnchor="middle"
          className="fill-muted text-[10px]"
        >
          {labels[index]}
        </text>
      ))}
    </svg>
  );
}

export function PerformanceCharts({
  range,
  loading = false,
  onRangeChange,
  series: seriesByMetric,
  audience,
}: {
  range: ChartRange;
  loading?: boolean;
  onRangeChange: (range: ChartRange) => void;
  series: OverviewPayload["series"];
  audience: OverviewPayload["audience"];
}) {
  const [metric, setMetric] = useState<ChartMetric>("views");
  const series = useMemo(
    () => seriesByMetric[metric] ?? { labels: [], values: [] },
    [metric, seriesByMetric],
  );
  const metricLabel = METRIC_TABS.find((tab) => tab.id === metric)?.label ?? "Views";

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-3" aria-busy={loading}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">Views & engagement</h3>
            <p className="mt-1 text-sm text-muted">
              {loading ? "Loading this range from YouTube…" : "Workspace performance for the selected range"}
            </p>
          </div>
          <label className="sr-only" htmlFor="performance-range">
            Chart date range
          </label>
          <select
            id="performance-range"
            value={range}
            onChange={(event) => onRangeChange(event.target.value as ChartRange)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"
          >
            {chartRangeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4">
          <Tabs tabs={METRIC_TABS} value={metric} onChange={(id) => setMetric(id as ChartMetric)} />
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="flex h-56 flex-col items-center justify-center gap-3" role="status">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-r-transparent" />
              <p className="text-sm text-muted">Loading {metricLabel.toLowerCase()}…</p>
            </div>
          ) : series.values.length === 0 ? (
            <div className="flex h-56 items-center justify-center">
              <p className="text-sm text-muted">No {metricLabel.toLowerCase()} for this range yet.</p>
            </div>
          ) : (
            <AreaChart labels={series.labels} values={series.values} metric={metric} />
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        <AudienceCard segments={audience.segments} primary={audience.primary} />
      </div>
    </div>
  );
}
