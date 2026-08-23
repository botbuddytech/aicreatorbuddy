import { topTimeSlots, type SchedulerBadgeTone } from "@/lib/dashboardContent";

const toneClass: Record<SchedulerBadgeTone, string> = {
  accent: "bg-accent/15 text-accent",
  "chart-blue": "bg-chart-blue/15 text-chart-blue",
  "chart-purple": "bg-chart-purple/15 text-chart-purple",
  "chart-amber": "bg-chart-amber/15 text-chart-amber",
  success: "bg-success/15 text-success",
};

function RankIcon({ rank }: { rank: number }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-4 w-4",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
  } as const;

  if (rank === 1) {
    return (
      <svg {...common}>
        <polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9" />
      </svg>
    );
  }
  if (rank === 2) {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="5" />
        <path d="M8 13l-2 8 6-3 6 3-2-8" />
      </svg>
    );
  }
  if (rank === 3) {
    return (
      <svg {...common}>
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
        <path d="M7 4H5a3 3 0 0 0 3 3M17 4h2a3 3 0 0 1-3 3" />
      </svg>
    );
  }
  return <span className="text-xs font-bold">{rank}</span>;
}

export function TopTimeSlots() {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-display text-lg font-semibold text-foreground">Top Performing Time Slots</h3>
      <ul className="mt-4 space-y-3">
        {topTimeSlots.map((slot) => (
          <li key={`${slot.day}-${slot.time}`} className="flex items-center gap-3">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass[slot.tone]}`}>
              <RankIcon rank={slot.rank} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {slot.day}, {slot.time}
              </p>
              <p className="text-xs text-muted">{slot.viewers} avg. viewers</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneClass[slot.tone]}`}>
              #{slot.rank}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
