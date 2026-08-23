import { Badge } from "@/components/ui/Badge";
import type { AdFormatRow } from "@/lib/monetizationContent";

const iconPaths: Record<string, string> = {
  skippable: "M8 5v14l11-7z",
  nonskip: "M4 6h16v12H4zM8 9l7 3-7 3z",
  bumper: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  display: "M4 5h16v10H4zM8 19h8",
  overlay: "M12 3l9 4v6c0 5-3.8 9.4-9 10-5.2-.6-9-5-9-10V7l9-4z",
  sponsored: "M12 2l2.4 7.2H22l-6 4.6 2.3 7.2L12 17.4 5.7 21l2.3-7.2-6-4.6h7.6z",
};

export function AdFormatCard({
  format,
  onView,
}: {
  format: AdFormatRow;
  onView?: () => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-soft">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-foreground" fill="currentColor">
              <path d={iconPaths[format.id] ?? iconPaths.skippable} />
            </svg>
          </span>
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">{format.label}</h3>
            <p className="text-xs text-muted">{format.subtitle}</p>
          </div>
        </div>
        <Badge tone={format.badgeTone} size="sm">
          {format.badge}
        </Badge>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted">Revenue</p>
          <p className="mt-1 font-display text-lg font-semibold text-foreground">{format.revenue}</p>
        </div>
        <div>
          <p className="text-xs text-muted">CPM</p>
          <p className="mt-1 font-display text-lg font-semibold text-foreground">{format.cpm}</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
          <span>Share of total revenue</span>
          <span>{format.share}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-soft">
          <div className={`h-full rounded-full ${format.color}`} style={{ width: `${format.share}%` }} />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className={`text-xs font-semibold ${format.positive ? "text-success" : "text-accent"}`}>
          {format.delta} vs last period
        </p>
        {onView ? (
          <button type="button" onClick={onView} className="text-xs font-semibold text-muted hover:text-foreground">
            View details →
          </button>
        ) : null}
      </div>
    </article>
  );
}
