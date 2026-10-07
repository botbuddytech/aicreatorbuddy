export type ExportDurationRange = "day" | "week" | "month";

export type ExportDurationSummary = {
  range: ExportDurationRange;
  totalSeconds: number;
  videoCount: number;
  label: string;
};

const WEEKDAY_FROM_MONDAY: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export function isExportDurationRange(value: string): value is ExportDurationRange {
  return value === "day" || value === "week" || value === "month";
}

export function isTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function calendarParts(timeZone: string, date: Date) {
  const bag = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    weekday: bag.weekday ?? "Mon",
    hour,
    minute: Number(bag.minute),
    second: Number(bag.second),
  };
}

function offsetMs(timeZone: string, date: Date): number {
  const parts = calendarParts(timeZone, date);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - date.getTime();
}

function zonedMidnight(timeZone: string, year: number, month: number, day: number): Date {
  const utc = Date.UTC(year, month - 1, day, 0, 0, 0);
  const first = utc - offsetMs(timeZone, new Date(utc));
  const second = utc - offsetMs(timeZone, new Date(first));
  return new Date(second);
}

function shiftDays(year: number, month: number, day: number, delta: number) {
  const next = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

export function periodStart(range: ExportDurationRange, timeZone: string, now: Date): Date {
  const today = calendarParts(timeZone, now);
  if (range === "month") return zonedMidnight(timeZone, today.year, today.month, 1);
  if (range === "day") return zonedMidnight(timeZone, today.year, today.month, today.day);
  const back = WEEKDAY_FROM_MONDAY[today.weekday] ?? 0;
  const monday = shiftDays(today.year, today.month, today.day, -back);
  return zonedMidnight(timeZone, monday.year, monday.month, monday.day);
}

export function formatExportDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remain = seconds % 60;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return remain > 0 ? `${minutes}m ${remain}s` : `${minutes}m`;
  return `${remain}s`;
}

export function rangeLabel(range: ExportDurationRange): string {
  if (range === "day") return "Today";
  if (range === "month") return "This month";
  return "This week";
}
