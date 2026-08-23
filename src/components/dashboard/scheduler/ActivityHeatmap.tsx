import { activityHeatmap, heatmapDays, heatmapHours } from "@/lib/dashboardContent";

const heatClass = ["bg-accent/10", "bg-accent/25", "bg-accent/45", "bg-accent/70", "bg-accent"] as const;

export function ActivityHeatmap() {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Audience Activity Heatmap</h3>
          <p className="mt-1 text-sm text-muted">Your audience&apos;s online activity pattern (last 30 days)</p>
        </div>
        <label className="sr-only" htmlFor="heatmap-range">
          Heatmap range
        </label>
        <select
          id="heatmap-range"
          defaultValue="30d"
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="mb-2 grid grid-cols-[3.25rem_repeat(12,minmax(0,1fr))] gap-1.5 pl-0">
            <span />
            {heatmapHours.map((hour) => (
              <span key={hour} className="text-center text-[10px] font-medium text-muted">
                {hour}
              </span>
            ))}
          </div>
          <div className="space-y-1.5">
            {heatmapDays.map((day) => (
              <div key={day.key} className="grid grid-cols-[3.25rem_repeat(12,minmax(0,1fr))] items-center gap-1.5">
                <span className="flex items-center gap-1 text-xs font-semibold text-muted">
                  {day.label}
                  {day.best ? (
                    <svg viewBox="0 0 24 24" className="h-3 w-3 text-success" fill="currentColor">
                      <path d="M12 2l2.4 6.6L21 10l-5 4.2L17.5 21 12 17.5 6.5 21 8 14.2 3 10l6.6-1.4z" />
                    </svg>
                  ) : null}
                </span>
                {activityHeatmap[day.key].map((value, index) => (
                  <span
                    key={`${day.key}-${heatmapHours[index]}`}
                    title={`${day.label} ${heatmapHours[index]}`}
                    className={`h-8 rounded-md ${heatClass[value] ?? heatClass[0]}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <div className="flex items-center gap-2">
          <span>Activity Level</span>
          <div className="flex items-center gap-1">
            {heatClass.map((tone) => (
              <span key={tone} className={`h-2.5 w-2.5 rounded-full ${tone}`} />
            ))}
          </div>
          <span>Low — High</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          Best Time to Post
        </div>
      </div>
    </section>
  );
}
