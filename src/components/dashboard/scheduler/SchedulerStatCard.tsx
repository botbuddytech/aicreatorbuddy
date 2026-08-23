import type { ReactNode } from "react";
import type { SchedulerBadgeTone, SchedulerStatIcon } from "@/lib/dashboardContent";

const badgeTone: Record<SchedulerBadgeTone, string> = {
  accent: "bg-accent/15 text-accent",
  "chart-blue": "bg-chart-blue/15 text-chart-blue",
  "chart-purple": "bg-chart-purple/15 text-chart-purple",
  "chart-amber": "bg-chart-amber/15 text-chart-amber",
  success: "bg-success/15 text-success",
};

const iconTone: Record<SchedulerBadgeTone, string> = {
  accent: "bg-accent/15 text-accent",
  "chart-blue": "bg-chart-blue/15 text-chart-blue",
  "chart-purple": "bg-chart-purple/15 text-chart-purple",
  "chart-amber": "bg-chart-amber/15 text-chart-amber",
  success: "bg-success/15 text-success",
};

function StatIcon({ icon }: { icon: SchedulerStatIcon }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-4 w-4",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
  } as const;

  if (icon === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    );
  }
  if (icon === "camera") {
    return (
      <svg {...common}>
        <path d="M15 10l4.55-2.27A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.89L15 14" />
        <rect x="3" y="6" width="12" height="12" rx="2" />
      </svg>
    );
  }
  if (icon === "broadcast") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="2" />
        <path d="M16.24 7.76a6 6 0 0 1 0 8.48M7.76 7.76a6 6 0 0 0 0 8.48M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    );
  }
  if (icon === "shorts") {
    return (
      <svg {...common}>
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path d="M10 8l5 4-5 4z" />
      </svg>
    );
  }
  if (icon === "upload") {
    return (
      <svg {...common}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
      </svg>
    );
  }
  if (icon === "check") {
    return (
      <svg {...common}>
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }
  if (icon === "processing") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  if (icon === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l4 2" />
      </svg>
    );
  }
  if (icon === "day") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18M8 14h4" />
      </svg>
    );
  }
  if (icon === "time") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  if (icon === "eye") {
    return (
      <svg {...common}>
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 3l1.6 4.2L18 9l-4.4 1.8L12 15l-1.6-4.2L6 9l4.4-1.8z" />
      <path d="M18 14l.8 2.1L21 17l-2.2.9L18 20l-.8-2.1L15 17l2.2-.9z" />
    </svg>
  );
}

export function SchedulerStatCard({
  icon,
  iconTone: iconToneKey,
  label,
  value,
  badge,
  sub,
}: {
  icon: SchedulerStatIcon;
  iconTone?: SchedulerBadgeTone;
  label: string;
  value: ReactNode;
  badge: { text: string; tone: SchedulerBadgeTone };
  sub?: ReactNode;
}) {
  const live = badge.text.toLowerCase() === "live";

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconTone[iconToneKey ?? badge.tone]}`}
        >
          <StatIcon icon={icon} />
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeTone[badge.tone]}`}
        >
          {live ? <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" /> : null}
          {badge.text}
        </span>
      </div>
      <div className="mt-3 font-display font-semibold tracking-tight text-foreground">
        {typeof value === "string" ? <p className="text-3xl">{value}</p> : value}
      </div>
      <p className="mt-1 text-sm text-muted">{label}</p>
      {sub ? <div className="mt-2 text-xs font-medium text-muted">{sub}</div> : null}
    </div>
  );
}
