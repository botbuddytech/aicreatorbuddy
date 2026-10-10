export type AudienceAgeInput = {
  label: string;
  value: number;
};

export type AudienceAgeSegment = {
  label: string;
  value: number;
  color: string;
};

export type GroupedAudienceAges = {
  segments: AudienceAgeSegment[];
  primary: string | null;
};

const BUCKETS = [
  { label: "13–17 years", color: "#f59e0b", test: (key: string) => key.startsWith("13") },
  { label: "18–24 years", color: "#3b82f6", test: (key: string) => key.startsWith("18") },
  { label: "25–34 years", color: "#8b5cf6", test: (key: string) => key.startsWith("25") },
  { label: "35–44 years", color: "#ec4899", test: (key: string) => key.startsWith("35") },
  {
    label: "45+ years",
    color: "#22c55e",
    test: (key: string) => key.startsWith("45") || key.startsWith("55") || key.startsWith("65"),
  },
] as const;

/** Collapse YouTube age groups into the dashboard bands (45–54, 55–64, and 65+ become 45+). */
export function groupAudienceAges(ages: readonly AudienceAgeInput[]): GroupedAudienceAges {
  const totals = BUCKETS.map(() => 0);
  const extras: AudienceAgeInput[] = [];

  for (const age of ages) {
    const value = Number.isFinite(age.value) ? Math.max(0, age.value) : 0;
    if (value <= 0) continue;
    const key = ageKey(age.label);
    const index = BUCKETS.findIndex((bucket) => bucket.test(key));
    if (index >= 0) {
      totals[index] = (totals[index] ?? 0) + value;
    } else if (key) {
      extras.push({ label: age.label, value });
    }
  }

  const rows = [
    ...BUCKETS.map((bucket, index) => ({
      label: bucket.label,
      color: bucket.color,
      raw: totals[index] ?? 0,
      always: index > 0,
    })),
    ...extras.map((extra) => ({
      label: extra.label,
      color: "#94a3b8",
      raw: extra.value,
      always: false,
    })),
  ].filter((row) => row.raw > 0 || row.always);

  const hasAgeData = rows.some((row) => row.raw > 0);
  if (!hasAgeData) return { segments: [], primary: null };

  const percents = toPercents(rows.map((row) => row.raw));
  const segments = rows.map((row, index) => ({
    label: row.label,
    value: percents[index] ?? 0,
    color: row.color,
  }));
  const peak = rows.reduce((best, row, index) => (row.raw > best.raw ? { raw: row.raw, index } : best), {
    raw: -1,
    index: 0,
  });

  return {
    segments,
    primary: rows[peak.index]?.label ?? null,
  };
}

function ageKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/years?/g, "")
    .replace(/[–—−]/g, "-")
    .replace(/[^0-9+-]/g, "");
}

function toPercents(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return values.map(() => 0);
  const raw = values.map((value) => (value / total) * 100);
  const floors = raw.map((value) => Math.floor(value));
  let remainder = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  const percents = [...floors];
  for (const item of order) {
    if (remainder <= 0) break;
    percents[item.index] = (percents[item.index] ?? 0) + 1;
    remainder -= 1;
  }
  return percents;
}
