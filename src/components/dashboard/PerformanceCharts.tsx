"use client";

import { useMemo, useState } from "react";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { Tabs } from "@/components/ui/Tabs";
import {
  audienceAge,
  chartRangeOptions,
  engagementSeries,
  type ChartMetric,
  type ChartRange,
} from "@/lib/dashboardContent";

const METRIC_TABS: { id: ChartMetric; label: string }[] = [
  { id: "views", label: "Views" },
  { id: "engagement", label: "Engagement" },
  { id: "revenue", label: "Revenue" },
];

function formatAxis(metric: ChartMetric, value: number): string {
  if (metric === "revenue") return `$${value}K`;
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
  onRangeChange,
}: {
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
}) {
  const [metric, setMetric] = useState<ChartMetric>("views");
  const series = useMemo(() => engagementSeries[metric][range], [metric, range]);

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">Views & engagement</h3>
            <p className="mt-1 text-sm text-muted">Workspace performance for the selected range</p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface-soft p-1">
            {chartRangeOptions.map((option) => {
              const active = range === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onRangeChange(option.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    active ? "bg-accent text-white" : "text-muted hover:text-foreground"
                  }`}
                >
                  {option.short}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-4">
          <Tabs tabs={METRIC_TABS} value={metric} onChange={(id) => setMetric(id as ChartMetric)} />
        </div>
        <div className="mt-4">
          <AreaChart labels={series.labels} values={series.values} metric={metric} />
        </div>
      </div>

      <div className="lg:col-span-2">
        <DonutChart
          title="Audience"
          subtitle="Age mix of returning viewers"
          total={audienceAge.total}
          segments={audienceAge.segments}
          formatValue={(value) => `${value}%`}
          totalCaption="subs"
        />
      </div>
    </div>
  );
}
