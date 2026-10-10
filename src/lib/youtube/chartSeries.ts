const MAX_POINTS = 12;

/** Collapse a dated series into at most 12 summed points with readable labels. */
export function bucketSeries(
  dates: string[],
  values: number[],
  maxPoints = MAX_POINTS,
): { labels: string[]; values: number[] } {
  const count = Math.min(dates.length, values.length);
  if (!count) return { labels: [], values: [] };
  const bucket = count <= maxPoints ? 1 : Math.ceil(count / maxPoints);
  const labels: string[] = [];
  const summed: number[] = [];
  for (let index = 0; index < count; index += bucket) {
    const end = Math.min(count, index + bucket);
    let total = 0;
    for (let cursor = index; cursor < end; cursor += 1) total += values[cursor] ?? 0;
    labels.push(formatBucketLabel(dates[index] ?? "", dates[end - 1] ?? ""));
    summed.push(total);
  }
  return { labels, values: summed };
}

function formatBucketLabel(start: string, end: string): string {
  if (start.slice(0, 7) === end.slice(0, 7)) return formatPoint(start);
  return formatPoint(start.length === 7 ? start : start.slice(0, 7));
}

function formatPoint(date: string): string {
  const [yearText, monthText, dayText] = date.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = dayText ? Number(dayText) : undefined;
  if (!year || !month) return date;
  const when = new Date(Date.UTC(year, month - 1, day || 1));
  if (!day) {
    return when.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
  }
  return when.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
