"use client";

import { useState } from "react";
import { formatInt, sumTrend } from "@/lib/dashboardContent";

export function MiniSparkline({
  values,
  className = "",
  fill = false,
}: {
  values: readonly number[];
  className?: string;
  fill?: boolean;
}) {
  const max = Math.max(...values, 1);
  const width = 88;
  const height = 28;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const coords = values.map((value, index) => {
    const x = index * step;
    const y = height - (value / max) * (height - 2) - 1;
    return { x, y };
  });
  const linePoints = coords.map(({ x, y }) => `${x},${y}`).join(" ");
  const areaPoints = `${linePoints} ${width},${height} 0,${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      {fill ? <polygon points={areaPoints} fill="currentColor" fillOpacity="0.18" /> : null}
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={linePoints}
      />
    </svg>
  );
}

export function UsageTrendChart({
  values,
  dates,
}: {
  values: readonly number[];
  dates: readonly string[];
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const max = Math.max(...values, 1);
  const total = sumTrend(values);
  const average = values.length ? Math.round(total / values.length) : 0;
  const peakIndex = values.reduce((best, value, index) => (value > values[best] ? index : best), 0);
  const peak = values[peakIndex] ?? 0;
  const peakDate = dates[peakIndex] ?? "—";

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Requests · last 30 days</h3>
          <p className="mt-1 text-sm text-muted">
            {dates[0]} – {dates[dates.length - 1]}
          </p>
        </div>
        <p className="text-sm text-muted">
          {hoverIndex !== null ? (
            <>
              <span className="font-medium text-foreground">{dates[hoverIndex]}</span>
              {" · "}
              {formatInt(values[hoverIndex] ?? 0)} calls
            </>
          ) : (
            "Hover a bar for the daily count"
          )}
        </p>
      </div>

      <div className="mt-6 flex h-40 items-end gap-1">
        {values.map((value, index) => {
          const height = `${Math.max((value / max) * 100, value > 0 ? 4 : 0)}%`;
          const active = hoverIndex === index;
          return (
            <button
              key={dates[index] ?? index}
              type="button"
              aria-label={`${dates[index] ?? `Day ${index + 1}`}: ${value} calls`}
              className="relative flex h-full min-w-0 flex-1 items-end"
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
              onFocus={() => setHoverIndex(index)}
              onBlur={() => setHoverIndex(null)}
            >
              <span
                className={`w-full rounded-t-sm transition-colors ${
                  active ? "bg-accent" : "bg-gradient-to-t from-accent/30 to-accent/80"
                }`}
                style={{ height }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex justify-between text-[11px] text-muted">
        <span>{dates[0]}</span>
        <span>{dates[Math.floor(dates.length / 2)]}</span>
        <span>{dates[dates.length - 1]}</span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
        <div>
          <p className="text-xs text-muted">Total</p>
          <p className="mt-1 font-display text-lg font-semibold text-foreground">{formatInt(total)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Daily average</p>
          <p className="mt-1 font-display text-lg font-semibold text-foreground">{formatInt(average)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Peak day</p>
          <p className="mt-1 font-display text-lg font-semibold text-foreground">
            {formatInt(peak)}
            <span className="ml-1 text-xs font-medium text-muted">{peakDate}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
