export type AnalyticsRangeKey = "7d" | "28d" | "90d" | "1y" | "all";

/** YouTube Analytics has channel data from the service launch onward. */
export const LIFETIME_START = "2005-02-14";

export function rangeDayCount(range: string): number {
  if (range === "7d") return 7;
  if (range === "90d") return 90;
  if (range === "1y") return 365;
  if (range === "all") return 0;
  return 28;
}

export function asAnalyticsRange(value: string | null | undefined): AnalyticsRangeKey {
  if (value === "7d" || value === "90d" || value === "1y" || value === "28d" || value === "all") return value;
  return "28d";
}

/** YouTube Studio dates are Pacific Time, and "last N days" ends yesterday. */
export function reportingEnd(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return addUtcDays(new Date(Date.UTC(year, month - 1, day)), -1);
}

export function rangeWindow(range: AnalyticsRangeKey, end = reportingEnd()): {
  start: Date;
  end: Date;
  previousStart: Date | null;
  previousEnd: Date | null;
  grain: "day" | "month";
} {
  if (range === "all") {
    return {
      start: new Date(`${LIFETIME_START}T00:00:00.000Z`),
      end,
      previousStart: null,
      previousEnd: null,
      grain: "month",
    };
  }
  const days = rangeDayCount(range);
  const start = addUtcDays(end, -(days - 1));
  const previousEnd = addUtcDays(start, -1);
  const previousStart = addUtcDays(previousEnd, -(days - 1));
  return {
    start,
    end,
    previousStart,
    previousEnd,
    grain: range === "1y" ? "month" : "day",
  };
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Month reports require both dates to fall on the 1st.
 * The end date is the 1st of the last month included.
 * A mid-month end is returned separately and summed from days.
 */
export function monthQueryBounds(start: Date, end: Date): {
  start: Date;
  end: Date;
  partialStart: Date | null;
  partialEnd: Date | null;
} {
  const startAligned = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const lastOfEndMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0));
  if (lastOfEndMonth.getTime() <= end.getTime()) {
    return {
      start: startAligned,
      end: new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1)),
      partialStart: null,
      partialEnd: null,
    };
  }
  const lastComplete = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1));
  const partialStart = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  if (lastComplete.getTime() < startAligned.getTime()) {
    return { start: startAligned, end: addUtcDays(startAligned, -1), partialStart, partialEnd: end };
  }
  return { start: startAligned, end: lastComplete, partialStart, partialEnd: end };
}
