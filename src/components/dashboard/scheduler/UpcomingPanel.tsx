import Link from "next/link";
import { PlaceholderImage } from "@/components/create/PlaceholderImage";
import { calendarEvents, type CalendarEventKind } from "@/lib/dashboardContent";

const kindClass: Record<CalendarEventKind, string> = {
  scheduled: "bg-chart-blue/15 text-chart-blue",
  premiere: "bg-chart-purple/15 text-chart-purple",
  live: "bg-accent/15 text-accent",
};

const kindLabel: Record<CalendarEventKind, string> = {
  scheduled: "Scheduled",
  premiere: "Premiere",
  live: "Live",
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatWhen(year: number, month: number, day: number, time: string) {
  const eventDay = startOfDay(new Date(year, month, day));
  const today = startOfDay(new Date());
  const diff = Math.round((eventDay.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Tomorrow, ${time}`;
  const weekday = eventDay.toLocaleDateString("en-US", { weekday: "short" });
  return `${weekday}, ${time}`;
}

function upcomingItems() {
  const featured = calendarEvents.filter((event) => event.panel);
  if (featured.length > 0) return featured;
  const today = startOfDay(new Date());
  return [...calendarEvents]
    .filter((event) => startOfDay(new Date(event.year, event.month, event.day)).getTime() >= today.getTime())
    .sort((a, b) => {
      const left = new Date(a.year, a.month, a.day).getTime();
      const right = new Date(b.year, b.month, b.day).getTime();
      return left - right;
    })
    .slice(0, 3);
}

export function UpcomingPanel() {
  const items = upcomingItems();

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-foreground">Upcoming</h3>
        <Link
          href="/dashboard/scheduler/upcoming"
          className="text-sm font-semibold text-accent transition-colors hover:text-accent-dark"
        >
          View All
        </Link>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-border p-3">
            <div className="flex gap-3">
              <PlaceholderImage label={item.title} className="h-14 w-[4.75rem] shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  {formatWhen(item.year, item.month, item.day, item.time)}
                </p>
                <span
                  className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${kindClass[item.kind]}`}
                >
                  {item.kind === "live" ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />
                  ) : null}
                  {kindLabel[item.kind]}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
