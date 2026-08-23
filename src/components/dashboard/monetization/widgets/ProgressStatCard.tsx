import type { ProgressStat } from "@/lib/monetizationContent";

const tones = {
  success: "bg-success",
  purple: "bg-chart-purple",
  accent: "bg-accent",
  blue: "bg-chart-blue",
  amber: "bg-chart-amber",
};

export function ProgressStatCard({
  stat,
  tone = "success",
}: {
  stat: ProgressStat;
  tone?: keyof typeof tones;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">{stat.label}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            stat.positive ? "bg-success/15 text-success" : "bg-chart-amber/15 text-chart-amber"
          }`}
        >
          {stat.delta}
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-foreground">{stat.value}</p>
      {stat.hint ? <p className="mt-1 text-[11px] text-muted">{stat.hint}</p> : null}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
          <span>{stat.progressLabel}</span>
          <span>{stat.progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-soft">
          <div className={`h-full rounded-full ${tones[tone]}`} style={{ width: `${stat.progress}%` }} />
        </div>
      </div>
    </div>
  );
}
