export type PostingVideo = {
  publishedAt: string;
  viewCount: number;
};

export type PostingSlot = {
  day: string;
  hour: number;
  views: number;
};

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function postingHeatmap(videos: PostingVideo[]): Record<(typeof DAY_KEYS)[number], number[]> {
  const totals: Record<(typeof DAY_KEYS)[number], number[]> = {
    sun: Array(12).fill(0),
    mon: Array(12).fill(0),
    tue: Array(12).fill(0),
    wed: Array(12).fill(0),
    thu: Array(12).fill(0),
    fri: Array(12).fill(0),
    sat: Array(12).fill(0),
  };
  for (const video of videos) {
    const date = new Date(video.publishedAt);
    if (Number.isNaN(date.getTime())) continue;
    const day = DAY_KEYS[date.getUTCDay()] ?? "sun";
    const bucket = Math.min(11, Math.floor(date.getUTCHours() / 2));
    totals[day][bucket] += Math.max(0, video.viewCount);
  }
  let max = 0;
  for (const day of DAY_KEYS) {
    for (const value of totals[day]) max = Math.max(max, value);
  }
  if (max === 0) return totals;
  return Object.fromEntries(
    DAY_KEYS.map((day) => [day, totals[day].map((value) => Math.round((value / max) * 4))]),
  ) as Record<(typeof DAY_KEYS)[number], number[]>;
}

export function topPostingSlots(videos: PostingVideo[], limit = 4): PostingSlot[] {
  const buckets = new Map<string, PostingSlot>();
  for (const video of videos) {
    const date = new Date(video.publishedAt);
    if (Number.isNaN(date.getTime())) continue;
    const hour = date.getUTCHours();
    const day = DAY_LABELS[date.getUTCDay()] ?? "Sun";
    const key = `${day}-${hour}`;
    const current = buckets.get(key) ?? { day, hour, views: 0 };
    current.views += Math.max(0, video.viewCount);
    buckets.set(key, current);
  }
  return [...buckets.values()].sort((a, b) => b.views - a.views).slice(0, limit);
}

export function formatHourLabel(hour: number): string {
  const suffix = hour >= 12 ? "PM" : "AM";
  const value = hour % 12 || 12;
  return `${value}:00 ${suffix} UTC`;
}
