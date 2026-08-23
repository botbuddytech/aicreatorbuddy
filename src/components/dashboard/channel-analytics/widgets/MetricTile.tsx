import type { ReactNode } from "react";
import type { DeltaStat } from "@/lib/channelAnalyticsContent";

const tones: Record<string, string> = {
  accent: "bg-accent/15 text-accent",
  blue: "bg-chart-blue/15 text-chart-blue",
  purple: "bg-chart-purple/15 text-chart-purple",
  success: "bg-success/15 text-success",
  amber: "bg-chart-amber/15 text-chart-amber",
};

function DefaultIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19V5M4 19l6-6 4 4 8-10" />
    </svg>
  );
}

export function MetricTile({
  stat,
  icon,
  tone = "accent",
}: {
  stat: DeltaStat;
  icon?: ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">{stat.label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>
          {icon ?? <DefaultIcon />}
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-foreground">{stat.value}</p>
      <p className={`mt-1 text-xs font-semibold ${stat.positive ? "text-success" : "text-chart-amber"}`}>
        {stat.delta}
      </p>
      {stat.hint ? <p className="mt-1 text-[11px] text-muted">{stat.hint}</p> : null}
    </div>
  );
}
