"use client";

import { useMemo, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { calendarEvents, type CalendarEventKind } from "@/lib/dashboardContent";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const kindDot: Record<CalendarEventKind, string> = {
  scheduled: "bg-chart-blue",
  premiere: "bg-chart-purple",
  live: "bg-accent",
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function eventsOn(year: number, month: number, day: number) {
  return calendarEvents.filter((event) => event.year === year && event.month === month && event.day === day);
}

function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push({
      date: new Date(year, month - 1, daysInPrev - startOffset + 1 + i),
      inMonth: false,
    });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, month, day), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({
      date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
      inMonth: false,
    });
  }
  return cells;
}

export function ContentCalendar() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [view, setView] = useState<"month" | "week">("month");

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = useMemo(() => monthCells(year, month), [year, month]);

  const weekCells = useMemo(() => {
    const weekStart = new Date(cursor);
    weekStart.setDate(cursor.getDate() - cursor.getDay());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return { date, inMonth: date.getMonth() === month };
    });
  }, [cursor, month]);

  function goToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), view === "week" ? today.getDate() : 1));
  }

  function shift(delta: number) {
    setCursor((current) => {
      const next = new Date(current);
      if (view === "week") {
        next.setDate(current.getDate() + delta * 7);
      } else {
        next.setMonth(current.getMonth() + delta, 1);
      }
      return next;
    });
  }

  const grid = view === "month" ? cells : weekCells;

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => shift(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted hover:bg-white/5 hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h3 className="min-w-[9.5rem] text-center font-display text-lg font-semibold text-foreground">
            {monthLabel(year, month)}
          </h3>
          <button
            type="button"
            aria-label="Next"
            onClick={() => shift(1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted hover:bg-white/5 hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          <ActionButton variant="secondary" size="sm" onClick={goToday}>
            Today
          </ActionButton>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-xl border border-border">
            {(["month", "week"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setView(mode);
                  if (mode === "week") {
                    const now = new Date();
                    if (now.getFullYear() === year && now.getMonth() === month) {
                      setCursor(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
                    }
                  } else {
                    setCursor(new Date(year, month, 1));
                  }
                }}
                className={`px-3 py-1.5 text-sm font-semibold capitalize ${
                  view === mode ? "bg-accent text-white" : "bg-surface text-muted hover:text-foreground"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <ActionButton variant="secondary" size="sm" type="button">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M7 12h10M10 17h4" />
            </svg>
            Filter
          </ActionButton>
          <ActionButton variant="secondary" size="sm" type="button">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export
          </ActionButton>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 border-t border-l border-border">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="border-b border-r border-border bg-surface-soft/60 px-2 py-2 text-center text-[11px] font-semibold tracking-wide text-muted uppercase"
          >
            {day}
          </div>
        ))}
        {grid.map((cell) => {
          const current = isSameDay(cell.date, today);
          const events = eventsOn(cell.date.getFullYear(), cell.date.getMonth(), cell.date.getDate());
          const kinds = [...new Set(events.map((event) => event.kind))];
          return (
            <div
              key={cell.date.toISOString()}
              className={`min-h-[5.5rem] border-b border-r border-border p-2 ${
                view === "week" ? "min-h-[8.5rem]" : ""
              } ${current ? "bg-accent/10" : ""}`}
            >
              <span
                className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                  current
                    ? "bg-accent text-white"
                    : cell.inMonth
                      ? "text-foreground"
                      : "text-muted/50"
                }`}
              >
                {cell.date.getDate()}
              </span>
              {events.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {view === "week"
                    ? events.slice(0, 3).map((event) => (
                        <p key={event.id} className="truncate text-[11px] font-medium text-foreground">
                          {event.time} · {event.title}
                        </p>
                      ))
                    : null}
                  <div className="flex flex-wrap gap-1">
                    {kinds.map((kind) => (
                      <span key={kind} className={`h-1.5 w-1.5 rounded-full ${kindDot[kind]}`} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
