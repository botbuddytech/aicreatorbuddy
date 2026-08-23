import {
  formatCount,
  formatInt,
  formatUsd,
  type ChannelStatus,
} from "@/lib/dashboardContent";

export type AnalyticsRange = "7d" | "28d" | "90d";
export type AnalyticsSection = "overview" | "audience" | "engagement" | "traffic";

export const analyticsRangeOptions: { id: AnalyticsRange; label: string }[] = [
  { id: "7d", label: "Last 7 days" },
  { id: "28d", label: "Last 28 days" },
  { id: "90d", label: "Last 90 days" },
];

export type DeltaStat = {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  hint?: string;
};

export type NamedShare = {
  label: string;
  value: number;
  color: string;
  hex: string;
};

export type TrendSeries = { label: string; hex: string; values: number[] };
export type TrendBlock = { labels: string[]; series: TrendSeries[] };
export type HeatmapBlock = { rows: string[]; cols: string[]; values: number[][] };

export type GeoRow = {
  label: string;
  flag: string;
  value: number;
  views: string;
  color: string;
};

export type DeviceMix = {
  donut: NamedShare[];
  tiles: { label: string; value: string; color: string }[];
  os: NamedShare[];
  playback: NamedShare[];
};

export type VideoRow = {
  title: string;
  duration: string;
  published: string;
  views: string;
  viewsDelta: string;
  viewsPositive: boolean;
  watchTime: string;
  avd: string;
  ctr: string;
  ctrLabel: "Above avg" | "Average" | "Below avg";
  engagement: "High" | "Medium" | "Low";
};

export type SearchTermRow = {
  term: string;
  views: string;
  ctr: string;
  ctrPositive: boolean;
  hot: boolean;
  trend: number[];
  trendUp: boolean;
};

export type ExternalRow = {
  source: string;
  views: string;
  watchTime: string;
  trendUp: boolean;
};

export type TrafficSourceRow = {
  label: string;
  hex: string;
  color: string;
  views: string;
  watchTime: string;
  ctr: string;
  delta: string;
  positive: boolean;
  share: number;
};

export type CommentSample = {
  text: string;
  sentiment: "positive" | "neutral" | "negative";
};

export type OverviewData = {
  live: { viewers: string; viewsHour: string; newSubs: string };
  stats: DeltaStat[];
  viewsTrend: TrendBlock;
  watchTrend: TrendBlock;
  trafficDonut: NamedShare[];
  engagementTiles: DeltaStat[];
  avgDuration: { watched: string; length: string; percent: number };
  ageGender: { ages: string[]; male: number[]; female: number[] };
  topVideos: VideoRow[];
  postingHeatmap: HeatmapBlock;
  postingInsight: string;
  geo: GeoRow[];
  devices: DeviceMix;
};

export type AudienceData = {
  stats: DeltaStat[];
  ageBars: NamedShare[];
  genderDonut: NamedShare[];
  subscriberDonut: NamedShare[];
  primaryAudience: string;
  demoInsight: string;
  geo: GeoRow[];
  watchHeatmap: HeatmapBlock;
  watchInsight: string;
  sessionTiles: DeltaStat[];
  growthTrend: TrendBlock;
  devices: DeviceMix;
};

export type EngagementData = {
  score: number;
  scoreDelta: string;
  tiles: DeltaStat[];
  aiInsight: string;
  trend: TrendBlock;
  engageHeatmap: HeatmapBlock;
  contentType: NamedShare[];
  sources: NamedShare[];
  radar: { label: string; value: number }[];
  likedVideos: VideoRow[];
  commentKeywords: NamedShare[];
  comments: CommentSample[];
  shareDestinations: NamedShare[];
  retention: TrendBlock;
  sentiment: NamedShare[];
};

export type TrafficData = {
  stats: DeltaStat[];
  distribution: NamedShare[];
  topSources: TrafficSourceRow[];
  trendDaily: TrendBlock;
  trendWeekly: TrendBlock;
  trendMonthly: TrendBlock;
  geo: GeoRow[];
  searchTerms: SearchTermRow[];
  external: ExternalRow[];
  devices: DeviceMix;
};

export type ChannelAnalytics = {
  channel: ChannelStatus;
  overview: OverviewData;
  audience: AudienceData;
  engagement: EngagementData;
  traffic: TrafficData;
};

const HEX = {
  accent: "#ff3b4e",
  blue: "#3b82f6",
  purple: "#a855f7",
  amber: "#f59e0b",
  success: "#22c55e",
  pink: "#fb7185",
  sky: "#38bdf8",
  muted: "#6b7280",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_SUN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const AGES = ["13–17", "18–24", "25–34", "35–44", "45–54", "55+"];
const AGE_HEX = [HEX.sky, HEX.accent, HEX.purple, HEX.success, HEX.amber, HEX.purple];
const HOURS_24 = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return "12a";
  if (i < 12) return String(i);
  if (i === 12) return "12p";
  return String(i - 12);
});

const COUNTRIES: { label: string; flag: string }[] = [
  { label: "United States", flag: "🇺🇸" },
  { label: "United Kingdom", flag: "🇬🇧" },
  { label: "India", flag: "🇮🇳" },
  { label: "Canada", flag: "🇨🇦" },
  { label: "Germany", flag: "🇩🇪" },
  { label: "Australia", flag: "🇦🇺" },
  { label: "Brazil", flag: "🇧🇷" },
];

const VIDEO_TITLES = [
  "Building a Complete SaaS in Public",
  "I Tried Every AI Video Tool in 2026",
  "Thumbnail Psychology: 7 Hooks That Work",
  "Why Your Retention Drops at 0:08",
  "Faceless Niche: 30-Day Case Study",
  "Script to Publish in 20 Minutes",
  "The Algorithm Change Nobody Noticed",
  "Shorts Sprint: 5 Hooks, 1 Topic",
];

const SEARCH_TERMS = [
  "youtube automation tutorial",
  "faceless channel ideas 2026",
  "ai video editor comparison",
  "thumbnail ctr tips",
  "how to grow youtube fast",
];

const COMMENTS: CommentSample[] = [
  { text: "This workflow just saved me 4 hours. Instant sub.", sentiment: "positive" },
  { text: "Need a follow-up on Shorts specifically.", sentiment: "neutral" },
  { text: "Audio dips around 3:20 — otherwise fire.", sentiment: "negative" },
  { text: "Best breakdown of the algorithm I've seen.", sentiment: "positive" },
  { text: "Can you share the exact prompt stack?", sentiment: "positive" },
  { text: "Not sure this works for small channels.", sentiment: "negative" },
];

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed || 1;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function parseCompact(raw: string): number {
  const cleaned = raw.replace(/[$,]/g, "").trim();
  if (cleaned.endsWith("M")) return parseFloat(cleaned) * 1_000_000;
  if (cleaned.endsWith("K")) return parseFloat(cleaned) * 1_000;
  return Number.parseFloat(cleaned) || 0;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round(n: number): number {
  return Math.round(n);
}

function pickDelta(rand: () => number, spread = 18): { text: string; positive: boolean } {
  const value = (rand() * 2 - 0.35) * spread;
  const positive = value >= 0;
  return { text: `${positive ? "+" : ""}${value.toFixed(1)}%`, positive };
}

function deltaFields(rand: () => number, spread?: number): { delta: string; positive: boolean } {
  const result = pickDelta(rand, spread);
  return { delta: result.text, positive: result.positive };
}

function seriesFrom(
  rand: () => number,
  length: number,
  base: number,
  volatility: number,
  trend = 0.04,
): number[] {
  const values: number[] = [];
  let current = base;
  for (let i = 0; i < length; i += 1) {
    current = Math.max(base * 0.35, current * (1 + trend * 0.25) + (rand() - 0.45) * volatility);
    values.push(round(current));
  }
  return values;
}

function makeHeatmap(
  rows: string[],
  cols: string[],
  rand: () => number,
  peakStart: number,
  peakEnd: number,
): HeatmapBlock {
  return {
    rows,
    cols,
    values: rows.map((_, row) =>
      cols.map((__, col) => {
        const inPeak = col >= peakStart && col <= peakEnd;
        const weekendBoost = row >= 5 ? 0.08 : 0;
        const base = inPeak ? 0.55 + rand() * 0.45 : 0.08 + rand() * 0.35;
        return clamp(base + weekendBoost, 0.05, 1);
      }),
    ),
  };
}

function shareList(
  items: { label: string; color: string; hex: string }[],
  weights: number[],
): NamedShare[] {
  const sum = weights.reduce((acc, n) => acc + n, 0) || 1;
  return items.map((item, index) => ({
    label: item.label,
    color: item.color,
    hex: item.hex,
    value: Math.round(((weights[index] ?? 0) / sum) * 1000) / 10,
  }));
}

function geoRows(rand: () => number, views: number): GeoRow[] {
  const weights = [0.3, 0.12, 0.11, 0.08, 0.07, 0.06, 0.05].map((w) => w + (rand() - 0.5) * 0.04);
  const sum = weights.reduce((acc, n) => acc + n, 0);
  const colors = [
    "bg-accent",
    "bg-chart-blue",
    "bg-chart-purple",
    "bg-success",
    "bg-chart-amber",
    "bg-accent",
    "bg-chart-blue",
  ];
  return COUNTRIES.map((country, index) => {
    const share = ((weights[index] ?? 0) / sum) * 100;
    return {
      ...country,
      value: Math.round(share * 10) / 10,
      views: formatCount(round((views * share) / 100)),
      color: colors[index] ?? "bg-accent",
    };
  });
}

function deviceMix(rand: () => number): DeviceMix {
  const mobile = 48 + rand() * 16;
  const desktop = 18 + rand() * 12;
  const tv = 8 + rand() * 8;
  const tablet = Math.max(3, 100 - mobile - desktop - tv);
  const donut = shareList(
    [
      { label: "Mobile", color: "bg-accent", hex: HEX.accent },
      { label: "Desktop", color: "bg-chart-blue", hex: HEX.blue },
      { label: "TV", color: "bg-chart-purple", hex: HEX.pink },
      { label: "Tablet", color: "bg-success", hex: HEX.success },
    ],
    [mobile, desktop, tv, tablet],
  );
  return {
    donut,
    tiles: donut.map((item) => ({ label: item.label, value: `${item.value}%`, color: item.color })),
    os: shareList(
      [
        { label: "Android", color: "bg-success", hex: HEX.success },
        { label: "iOS", color: "bg-accent", hex: HEX.accent },
        { label: "Windows", color: "bg-chart-blue", hex: HEX.sky },
        { label: "macOS", color: "bg-chart-amber", hex: HEX.amber },
        { label: "Smart TV", color: "bg-chart-purple", hex: HEX.purple },
      ],
      [40 + rand() * 8, 28 + rand() * 8, 16 + rand() * 5, 5 + rand() * 3, 1 + rand() * 2],
    ),
    playback: shareList(
      [
        { label: "YouTube Watch Page", color: "bg-accent", hex: HEX.accent },
        { label: "Embedded Player", color: "bg-chart-purple", hex: HEX.purple },
        { label: "Channel Page", color: "bg-chart-blue", hex: HEX.sky },
        { label: "Shorts Feed", color: "bg-success", hex: HEX.success },
        { label: "Other", color: "bg-chart-amber", hex: HEX.amber },
      ],
      [68 + rand() * 8, 12 + rand() * 5, 7 + rand() * 3, 2 + rand() * 2, 1 + rand()],
    ),
  };
}

function videoRows(rand: () => number, views: number): VideoRow[] {
  return VIDEO_TITLES.slice(0, 6).map((title, index) => {
    const viewsDelta = pickDelta(rand, 40);
    const ctr = 4 + rand() * 6;
    const engagementRand = rand();
    const engagement: VideoRow["engagement"] =
      engagementRand > 0.62 ? "High" : engagementRand > 0.32 ? "Medium" : "Low";
    const ctrLabel: VideoRow["ctrLabel"] = ctr >= 7 ? "Above avg" : ctr >= 5 ? "Average" : "Below avg";
    return {
      title,
      duration: `${8 + round(rand() * 10)}:${String(round(rand() * 59)).padStart(2, "0")}`,
      published: `${2 + index} days ago`,
      views: formatCount(round(views * (0.18 - index * 0.02) * (0.8 + rand() * 0.4))),
      viewsDelta: viewsDelta.text,
      viewsPositive: viewsDelta.positive,
      watchTime: `${formatCount(round(views * 0.012 * (0.8 + rand() * 0.4)))} hrs`,
      avd: `${(42 + rand() * 22).toFixed(1)}% AVD`,
      ctr: `${ctr.toFixed(1)}%`,
      ctrLabel,
      engagement,
    };
  });
}

function labelsFor(range: AnalyticsRange): string[] {
  if (range === "7d") return DAYS;
  if (range === "90d") return ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
  return ["Week 1", "Week 2", "Week 3", "Week 4"];
}

function buildOverview(
  rand: () => number,
  channel: ChannelStatus,
  views: number,
  subs: number,
  revenue: number,
  range: AnalyticsRange,
): OverviewData {
  const labels = labelsFor(range);
  const viewsDelta = pickDelta(rand);
  const subDelta = pickDelta(rand, 10);
  const revDelta = pickDelta(rand, 22);
  const watchDelta = pickDelta(rand, 8);
  const watchHours = views * 0.085;
  return {
    live: {
      viewers: formatInt(round(800 + rand() * 900)),
      viewsHour: `+${formatInt(round(180 + rand() * 260))}`,
      newSubs: `+${round(8 + rand() * 24)}`,
    },
    stats: [
      {
        label: "Total views",
        value: formatCount(views),
        delta: `${viewsDelta.text} vs last period`,
        positive: viewsDelta.positive,
      },
      {
        label: "Subscribers",
        value: formatCount(subs),
        delta: `${subDelta.text} this month`,
        positive: subDelta.positive,
      },
      {
        label: "Est. revenue",
        value: formatUsd(revenue),
        delta: `${revDelta.text} vs last period`,
        positive: revDelta.positive,
      },
      {
        label: "Watch time",
        value: `${formatCount(round(watchHours))} hrs`,
        delta: `${watchDelta.text} vs last period`,
        positive: watchDelta.positive,
      },
    ],
    viewsTrend: {
      labels,
      series: [
        {
          label: "Views",
          hex: HEX.accent,
          values: seriesFrom(rand, labels.length, views / labels.length, views / 18, 0.06),
        },
      ],
    },
    watchTrend: {
      labels,
      series: [
        {
          label: "Watch time",
          hex: HEX.blue,
          values: seriesFrom(rand, labels.length, watchHours / labels.length, watchHours / 16, 0.03),
        },
      ],
    },
    trafficDonut: shareList(
      [
        { label: "YouTube Search", color: "bg-chart-purple", hex: HEX.purple },
        { label: "Suggested Videos", color: "bg-chart-blue", hex: HEX.sky },
        { label: "Browse Features", color: "bg-accent", hex: HEX.pink },
        { label: "External", color: "bg-success", hex: HEX.success },
        { label: "Other", color: "bg-chart-amber", hex: HEX.amber },
      ],
      [32 + rand() * 8, 24 + rand() * 8, 14 + rand() * 6, 9 + rand() * 5, 4 + rand() * 3],
    ),
    engagementTiles: [
      { label: "Likes", value: formatCount(round(views * 0.037)), ...deltaFields(rand) },
      { label: "Comments", value: formatCount(round(views * 0.002)), ...deltaFields(rand) },
      { label: "Shares", value: formatCount(round(views * 0.005)), ...deltaFields(rand) },
      { label: "Saves", value: formatCount(round(views * 0.0035)), ...deltaFields(rand) },
    ],
    avgDuration: { watched: "6:42", length: "12:30", percent: 53.6 },
    ageGender: {
      ages: AGES,
      male: [8, 18, 28, 16, 9, 4].map((n) => round(n + (rand() - 0.5) * 4)),
      female: [6, 14, 22, 12, 7, 3].map((n) => round(n + (rand() - 0.5) * 3)),
    },
    topVideos: videoRows(rand, views),
    postingHeatmap: makeHeatmap(DAYS, ["12a", "6a", "12p", "6p"], rand, 2, 3),
    postingInsight: `Best time: Wednesday 6–9 PM for ${channel.name}`,
    geo: geoRows(rand, views),
    devices: deviceMix(rand),
  };
}

function buildAudience(
  rand: () => number,
  views: number,
  subs: number,
  range: AnalyticsRange,
): AudienceData {
  const labels = labelsFor(range);
  const ageBars = shareList(
    AGES.map((label, index) => ({
      label,
      color: "bg-accent",
      hex: AGE_HEX[index] ?? HEX.accent,
    })),
    [10 + rand() * 8, 28 + rand() * 12, 22 + rand() * 8, 12 + rand() * 6, 6 + rand() * 4, 1 + rand() * 2],
  );
  const peakAge = [...ageBars].sort((a, b) => b.value - a.value)[0];
  return {
    stats: [
      {
        label: "Total subscribers",
        value: formatCount(subs),
        ...deltaFields(rand, 9),
        hint: `+${formatCount(round(subs * 0.012))} this period`,
      },
      {
        label: "Unique views",
        value: formatCount(round(views * 0.17)),
        ...deltaFields(rand),
        hint: `vs ${formatCount(round(views * 0.16))} last month`,
      },
      {
        label: "Returning viewers",
        value: formatCount(round(views * 0.11)),
        ...deltaFields(rand, 20),
        hint: "+28.2K this period",
      },
      {
        label: "Avg view duration",
        value: "8:42",
        ...deltaFields(rand, 12),
        hint: "Target: 10:00",
      },
    ],
    ageBars,
    genderDonut: shareList(
      [
        { label: "Male", color: "bg-chart-blue", hex: HEX.blue },
        { label: "Female", color: "bg-accent", hex: HEX.pink },
        { label: "Other", color: "bg-chart-purple", hex: HEX.purple },
      ],
      [62 + rand() * 10, 24 + rand() * 8, 2 + rand() * 3],
    ),
    subscriberDonut: shareList(
      [
        { label: "Subscribed", color: "bg-accent", hex: HEX.accent },
        { label: "Not subscribed", color: "bg-muted", hex: HEX.muted },
      ],
      [34 + rand() * 12, 55 + rand() * 10],
    ),
    primaryAudience: peakAge ? `${peakAge.label} years` : "18–24 years",
    demoInsight: "62% of your viewers haven't subscribed yet. Consider adding more CTAs in your videos.",
    geo: geoRows(rand, views),
    watchHeatmap: makeHeatmap(DAYS_SUN, HOURS_24, rand, 17, 21),
    watchInsight:
      "Based on your audience activity, the optimal posting times are Wednesday & Thursday 7–9 PM. Your audience is most active during evening hours.",
    sessionTiles: [
      { label: "Avg. session", value: "14m 08s", delta: "+1.2m", positive: true },
      { label: "Pages / session", value: "2.4 videos", delta: "+0.3", positive: true },
      { label: "Bounce (under 30s)", value: "18%", delta: "-2.1%", positive: true },
    ],
    growthTrend: {
      labels,
      series: [
        {
          label: "Net subscribers",
          hex: HEX.success,
          values: seriesFrom(rand, labels.length, subs * 0.01, subs * 0.002, 0.05),
        },
      ],
    },
    devices: deviceMix(rand),
  };
}

function buildEngagement(
  rand: () => number,
  views: number,
  subs: number,
  range: AnalyticsRange,
): EngagementData {
  const labels = labelsFor(range);
  const score = 7.4 + rand() * 1.8;
  const trendLen = range === "7d" ? 7 : labels.length;
  const trendLabels =
    range === "7d" ? ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"] : labels;
  return {
    score: Math.round(score * 10) / 10,
    scoreDelta: `+${(0.4 + rand() * 0.7).toFixed(1)} vs last period`,
    tiles: [
      {
        label: "Total likes",
        value: formatCount(round(views * 0.037)),
        ...deltaFields(rand),
        hint: `vs ${formatCount(round(views * 0.033))} last period`,
      },
      {
        label: "Total comments",
        value: formatCount(round(views * 0.002)),
        ...deltaFields(rand),
        hint: `vs ${formatCount(round(views * 0.0018))} last period`,
      },
      {
        label: "Total shares",
        value: formatCount(round(views * 0.005)),
        ...deltaFields(rand),
        hint: `vs ${formatCount(round(views * 0.004))} last period`,
      },
      { label: "Avg. watch time", value: "8:42", ...deltaFields(rand), hint: "Target: 10:00" },
      {
        label: "Click-through rate",
        value: `${(5.2 + rand() * 2).toFixed(1)}%`,
        ...deltaFields(rand, 6),
        hint: "Impressions → views",
      },
      {
        label: "Subscribers",
        value: formatCount(subs),
        ...deltaFields(rand, 8),
        hint: `+${formatCount(round(subs * 0.01))} this month`,
      },
    ],
    aiInsight:
      "Your engagement rate increased by 15% this week. Videos posted between 6–8 PM EST receive 2.3x more comments. Your How-to content performs 34% better than vlogs.",
    trend: {
      labels: trendLabels,
      series: [
        { label: "Likes", hex: HEX.accent, values: seriesFrom(rand, trendLen, views * 0.006, views * 0.001, -0.02) },
        {
          label: "Comments",
          hex: HEX.purple,
          values: seriesFrom(rand, trendLen, views * 0.0004, views * 0.00008, 0.02),
        },
        { label: "Shares", hex: HEX.sky, values: seriesFrom(rand, trendLen, views * 0.0008, views * 0.0002, 0.03) },
      ],
    },
    engageHeatmap: makeHeatmap(DAYS, ["12AM", "4AM", "8AM", "12PM", "4PM", "8PM"], rand, 4, 5),
    contentType: shareList(
      [
        { label: "Tutorials", color: "bg-accent", hex: HEX.accent },
        { label: "Vlogs", color: "bg-chart-purple", hex: HEX.purple },
        { label: "Reviews", color: "bg-chart-blue", hex: HEX.sky },
        { label: "Shorts", color: "bg-success", hex: HEX.success },
        { label: "Live", color: "bg-chart-amber", hex: HEX.amber },
      ],
      [38 + rand() * 8, 16 + rand() * 6, 14 + rand() * 5, 12 + rand() * 5, 8 + rand() * 4],
    ),
    sources: shareList(
      [
        { label: "Search Results", color: "bg-accent", hex: HEX.accent },
        { label: "Suggested Videos", color: "bg-chart-purple", hex: HEX.purple },
        { label: "Browse Features", color: "bg-chart-blue", hex: HEX.sky },
        { label: "External", color: "bg-success", hex: HEX.success },
        { label: "Direct/Unknown", color: "bg-chart-amber", hex: HEX.amber },
      ],
      [40 + rand() * 6, 24 + rand() * 6, 12 + rand() * 5, 8 + rand() * 4, 4 + rand() * 3],
    ),
    radar: [
      { label: "New viewers", value: 42 + rand() * 20 },
      { label: "Returning", value: 70 + rand() * 20 },
      { label: "Subscribers", value: 78 + rand() * 18 },
      { label: "Members", value: 30 + rand() * 20 },
      { label: "Super fans", value: 22 + rand() * 18 },
    ],
    likedVideos: videoRows(rand, views).slice(0, 5),
    commentKeywords: shareList(
      [
        { label: "tutorial", color: "bg-accent", hex: HEX.accent },
        { label: "prompt", color: "bg-chart-blue", hex: HEX.blue },
        { label: "thumbnail", color: "bg-chart-purple", hex: HEX.purple },
        { label: "shorts", color: "bg-success", hex: HEX.success },
        { label: "algorithm", color: "bg-chart-amber", hex: HEX.amber },
      ],
      [28, 22, 18, 16, 16].map((n) => n + rand() * 6),
    ),
    comments: COMMENTS,
    shareDestinations: shareList(
      [
        { label: "WhatsApp", color: "bg-success", hex: HEX.success },
        { label: "Twitter / X", color: "bg-chart-blue", hex: HEX.blue },
        { label: "Reddit", color: "bg-chart-amber", hex: HEX.amber },
        { label: "Facebook", color: "bg-chart-blue", hex: HEX.sky },
        { label: "Copy link", color: "bg-chart-purple", hex: HEX.purple },
      ],
      [30, 22, 18, 16, 14].map((n) => n + rand() * 5),
    ),
    retention: {
      labels: ["0%", "20%", "40%", "60%", "80%", "100%"],
      series: [
        {
          label: "Still watching",
          hex: HEX.accent,
          values: [100, 74, 58, 41, 28, 12].map((n) => round(n + (rand() - 0.5) * 6)),
        },
      ],
    },
    sentiment: shareList(
      [
        { label: "Positive", color: "bg-success", hex: HEX.success },
        { label: "Neutral", color: "bg-chart-blue", hex: HEX.blue },
        { label: "Negative", color: "bg-accent", hex: HEX.accent },
      ],
      [62 + rand() * 10, 22 + rand() * 8, 8 + rand() * 6],
    ),
  };
}

function buildTraffic(
  rand: () => number,
  views: number,
  subs: number,
  range: AnalyticsRange,
): TrafficData {
  const labels = labelsFor(range);
  const hours = Array.from({ length: 12 }, (_, i) => `${i * 2}:00`);
  const distribution = shareList(
    [
      { label: "YouTube Search", color: "bg-accent", hex: HEX.accent },
      { label: "Suggested Videos", color: "bg-chart-blue", hex: HEX.sky },
      { label: "Browse Features", color: "bg-chart-purple", hex: HEX.purple },
      { label: "External", color: "bg-success", hex: HEX.success },
      { label: "Direct", color: "bg-chart-amber", hex: HEX.amber },
      { label: "Playlists", color: "bg-accent", hex: HEX.pink },
    ],
    [33 + rand() * 6, 24 + rand() * 6, 14 + rand() * 4, 10 + rand() * 4, 6 + rand() * 3, 4 + rand() * 2],
  );
  const topSources: TrafficSourceRow[] = distribution.slice(0, 5).map((item) => {
    const d = pickDelta(rand, 20);
    return {
      label: item.label,
      hex: item.hex,
      color: item.color,
      views: formatCount(round((views * item.value) / 100)),
      watchTime: `${formatCount(round(((views * item.value) / 100) * 0.06))} hrs`,
      ctr: `${(4.8 + rand() * 4).toFixed(1)}%`,
      delta: d.text,
      positive: d.positive,
      share: item.value,
    };
  });
  return {
    stats: [
      {
        label: "Total views",
        value: formatCount(views),
        ...deltaFields(rand),
        hint: `vs ${formatCount(round(views * 0.89))} last period`,
      },
      {
        label: "Impressions",
        value: formatCount(round(views * 7.4)),
        ...deltaFields(rand, 20),
        hint: "RPM: $4.82",
      },
      {
        label: "Watch time",
        value: `${formatCount(round(views * 0.085))} hrs`,
        ...deltaFields(rand),
        hint: "Avg: 8:42 per viewer",
      },
      {
        label: "Subscribers",
        value: formatCount(subs),
        ...deltaFields(rand, 8),
        hint: `+${formatCount(round(subs * 0.008))} this month`,
      },
    ],
    distribution,
    topSources,
    trendDaily: {
      labels: hours,
      series: [{ label: "Views", hex: HEX.accent, values: seriesFrom(rand, hours.length, views / 40, views / 90, 0.08) }],
    },
    trendWeekly: {
      labels,
      series: [
        {
          label: "Views",
          hex: HEX.accent,
          values: seriesFrom(rand, labels.length, views / labels.length, views / 16, 0.05),
        },
      ],
    },
    trendMonthly: {
      labels: ["May", "Jun", "Jul", "Aug"],
      series: [{ label: "Views", hex: HEX.accent, values: seriesFrom(rand, 4, views * 0.7, views * 0.12, 0.07) }],
    },
    geo: geoRows(rand, views),
    searchTerms: SEARCH_TERMS.map((term, index) => {
      const d = pickDelta(rand, 16);
      return {
        term,
        views: formatCount(round(views * (0.09 - index * 0.012))),
        ctr: `${(4 + rand() * 6).toFixed(1)}%`,
        ctrPositive: d.positive,
        hot: index === 0,
        trend: seriesFrom(rand, 6, 40, 12, index % 2 === 0 ? 0.08 : -0.05),
        trendUp: index !== 3,
      };
    }),
    external: [
      {
        source: "Twitter / X",
        views: formatCount(round(views * 0.04)),
        watchTime: `${formatCount(round(views * 0.003))} hrs`,
        trendUp: true,
      },
      {
        source: "Reddit",
        views: formatCount(round(views * 0.028)),
        watchTime: `${formatCount(round(views * 0.002))} hrs`,
        trendUp: true,
      },
      {
        source: "Facebook",
        views: formatCount(round(views * 0.018)),
        watchTime: `${formatCount(round(views * 0.0014))} hrs`,
        trendUp: false,
      },
      {
        source: "WhatsApp",
        views: formatCount(round(views * 0.012)),
        watchTime: `${formatCount(round(views * 0.001))} hrs`,
        trendUp: true,
      },
      {
        source: "Google Search",
        views: formatCount(round(views * 0.009)),
        watchTime: `${formatCount(round(views * 0.0008))} hrs`,
        trendUp: true,
      },
    ],
    devices: deviceMix(rand),
  };
}

const cache = new Map<string, ChannelAnalytics>();

export function getChannelAnalytics(
  channel: ChannelStatus,
  range: AnalyticsRange = "28d",
): ChannelAnalytics {
  const key = `${channel.id}:${range}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const rand = mulberry32(hashString(`${channel.id}:${range}`));
  const views = parseCompact(channel.views);
  const subs = parseCompact(channel.subscribers);
  const revenue = parseCompact(channel.revenue);

  const analytics: ChannelAnalytics = {
    channel,
    overview: buildOverview(rand, channel, views, subs, revenue, range),
    audience: buildAudience(rand, views, subs, range),
    engagement: buildEngagement(rand, views, subs, range),
    traffic: buildTraffic(rand, views, subs, range),
  };
  cache.set(key, analytics);
  return analytics;
}

export function donutSegments(
  items: readonly NamedShare[],
): { label: string; value: number; color: string }[] {
  return items.map((item) => ({ label: item.label, value: item.value, color: item.hex }));
}

export function barItems(
  items: readonly NamedShare[],
): { label: string; value: number; color: string }[] {
  return items.map((item) => ({ label: item.label, value: item.value, color: item.color }));
}
