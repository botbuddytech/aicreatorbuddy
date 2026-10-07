"use client";

import { useEffect, useState } from "react";

type ExportDurationRange = "day" | "week" | "month";

type ExportDurationSummary = {
  range: ExportDurationRange;
  totalSeconds: number;
  videoCount: number;
  label: string;
};

const RANGES: { id: ExportDurationRange; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

function formatExportDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remain = seconds % 60;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return remain > 0 ? `${minutes}m ${remain}s` : `${minutes}m`;
  return `${remain}s`;
}

export function ExportDurationCard() {
  const [range, setRange] = useState<ExportDurationRange>("week");
  const [summary, setSummary] = useState<ExportDurationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    void fetch(
      `/api/dashboard/export-duration?range=${range}&timeZone=${encodeURIComponent(timeZone)}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as
          | (ExportDurationSummary & { error?: string })
          | null;
        if (!response.ok) throw new Error(body?.error || "Could not load export duration.");
        if (!body || typeof body.totalSeconds !== "number") {
          throw new Error("Could not load export duration.");
        }
        setSummary(body);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Could not load export duration.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [range]);

  const period = summary?.label ?? (range === "day" ? "Today" : range === "month" ? "This month" : "This week");
  const videos = summary?.videoCount ?? 0;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">Content exported</h3>
          <p className="mt-0.5 text-xs text-muted">
            {period}. Each video counts once, at its longest export.
          </p>
        </div>
        <div className="flex rounded-lg border border-border p-0.5">
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={range === item.id}
              onClick={() => {
                setLoading(true);
                setRange(item.id);
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                range === item.id ? "bg-accent text-white" : "text-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground">
        {loading ? "…" : error ? "—" : formatExportDuration(summary?.totalSeconds ?? 0)}
      </p>
      <p className="mt-1 text-xs text-muted">
        {error
          ? error
          : `${videos} video${videos === 1 ? "" : "s"}`}
      </p>
    </section>
  );
}
