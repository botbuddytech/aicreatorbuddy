import type { GeoRow } from "@/lib/channelAnalyticsContent";
import { Panel } from "./Panel";

export function GeoList({
  rows,
  title = "Top countries",
  subtitle = "Views by geography",
  footer,
}: {
  rows: readonly GeoRow[];
  title?: string;
  subtitle?: string;
  footer?: string;
}) {
  return (
    <Panel title={title} subtitle={subtitle}>
      <ul className="space-y-4">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-3">
            <span className="text-lg" aria-hidden>
              {row.flag}
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-foreground">{row.label}</span>
                <span className="shrink-0 font-medium text-muted">
                  {row.views} · {row.value}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
                <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.value}%` }} />
              </div>
            </div>
          </li>
        ))}
      </ul>
      {footer ? <p className="mt-4 text-center text-sm font-medium text-accent">{footer}</p> : null}
    </Panel>
  );
}
