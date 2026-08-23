import { MiniSparkline } from "@/components/dashboard/UsageTrendChart";
import type { OverviewPrimaryStat } from "@/lib/dashboardContent";

const accentIcon: Record<OverviewPrimaryStat["accent"], string> = {
  accent: "bg-accent/15 text-accent",
  "chart-blue": "bg-chart-blue/15 text-chart-blue",
  success: "bg-success/15 text-success",
  "chart-purple": "bg-chart-purple/15 text-chart-purple",
};

const sparkTone: Record<OverviewPrimaryStat["accent"], string> = {
  accent: "text-accent",
  "chart-blue": "text-chart-blue",
  success: "text-success",
  "chart-purple": "text-chart-purple",
};

function StatIcon({ icon }: { icon: OverviewPrimaryStat["icon"] }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-4 w-4",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
  } as const;

  if (icon === "views") {
    return (
      <svg {...common}>
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  if (icon === "subs") {
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  if (icon === "watch") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

export function OverviewStatCard({ stat }: { stat: OverviewPrimaryStat }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">{stat.label}</p>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${accentIcon[stat.accent]}`}
        >
          <StatIcon icon={stat.icon} />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
        {stat.value}
      </p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            stat.positive ? "bg-success/15 text-success" : "bg-chart-amber/15 text-chart-amber"
          }`}
        >
          {stat.delta}
        </span>
        <MiniSparkline
          values={stat.sparkline}
          fill
          className={`h-8 w-24 ${sparkTone[stat.accent]}`}
        />
      </div>
    </div>
  );
}
