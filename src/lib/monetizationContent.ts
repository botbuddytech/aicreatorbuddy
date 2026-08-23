import {
  formatCount,
  formatInt,
  formatUsd,
  type ChannelStatus,
} from "@/lib/dashboardContent";
import type {
  AnalyticsRange,
  DeltaStat,
  NamedShare,
  TrendBlock,
} from "@/lib/channelAnalyticsContent";

export type ProgressStat = DeltaStat & {
  progress: number;
  progressLabel: string;
};

export type EarningVideo = {
  id: string;
  title: string;
  published: string;
  duration: string;
  views: string;
  viewsToday: string;
  revenue: string;
  revenueValue: number;
  rpm: string;
  cpm: string;
  ctr: string;
  watchTime: string;
  status: "Viral" | "Growing" | "Stable";
  trend: number[];
  trendUp: boolean;
  format: "long" | "short" | "live";
  delta: string;
  positive: boolean;
};

export type MembershipTier = {
  name: string;
  price: string;
  revenue: string;
  members: string;
  color: string;
  icon: "crown" | "star" | "heart";
};

export type SuperChatSupporter = {
  rank: number;
  name: string;
  count: string;
  amount: string;
  highlight: boolean;
};

export type Transaction = {
  label: string;
  date: string;
  amount: string;
  positive: boolean;
  kind: "payout" | "membership" | "superchat" | "merch" | "fee";
};

export type AdFormatRow = {
  id: string;
  label: string;
  subtitle: string;
  revenue: string;
  revenueValue: number;
  share: number;
  cpm: string;
  badge: string;
  badgeTone: "success" | "amber" | "blue" | "accent" | "muted";
  delta: string;
  positive: boolean;
  color: string;
  hex: string;
};

export type InsightCard = {
  title: string;
  body: string;
  badge: string;
};

export type CategoryBar = {
  label: string;
  value: number;
  color: string;
  amount: string;
};

export type OverviewData = {
  revenueTrendDaily: TrendBlock;
  revenueTrendWeekly: TrendBlock;
  revenueTrendMonthly: TrendBlock;
  sources: NamedShare[];
  adIncome: DeltaStat[];
  topVideos: EarningVideo[];
  adFormatBars: NamedShare[];
  regions: { label: string; flag: string; value: number; amount: string; color: string }[];
  memberships: MembershipTier[];
  supporters: SuperChatSupporter[];
  transactions: Transaction[];
};

export type RpmCpmData = {
  cards: ProgressStat[];
  trend7: TrendBlock;
  trend28: TrendBlock;
  trend90: TrendBlock;
  breakdown: NamedShare[];
  insights: InsightCard[];
  topRpmVideos: EarningVideo[];
};

export type TopVideosData = {
  stats: ProgressStat[];
  leaderboard: EarningVideo[];
  breakdown: NamedShare[];
  videos: EarningVideo[];
  liveLeaderboard: EarningVideo[];
  trend: TrendBlock;
  categories: CategoryBar[];
};

export type AdFormatsData = {
  formatBars: { label: string; value: number; hex: string }[];
  distribution: NamedShare[];
  cards: AdFormatRow[];
};

export type MonetizationData = {
  channel: ChannelStatus;
  range: AnalyticsRange;
  header: DeltaStat[];
  overview: OverviewData;
  rpmCpm: RpmCpmData;
  topVideos: TopVideosData;
  adFormats: AdFormatsData;
};

const HEX = {
  accent: "#ff3b4e",
  blue: "#3b82f6",
  purple: "#a855f7",
  amber: "#f59e0b",
  success: "#22c55e",
  pink: "#fb7185",
  sky: "#38bdf8",
};

const VIDEO_TITLES = [
  "How to Build a YouTube Analytics Dashboard",
  "Complete Guide to Growing Your Channel in 2026",
  "Thumbnail Psychology: 7 Hooks That Work",
  "I Tried Every AI Video Tool in 2026",
  "Why Your Retention Drops at 0:08",
  "Faceless Niche: 30-Day Case Study",
  "Script to Publish in 20 Minutes",
  "The Algorithm Change Nobody Noticed",
  "Shorts Sprint: 5 Hooks, 1 Topic",
  "Mastering YouTube SEO in 2026",
  "How I Gained 10K Subscribers in 30 Days",
  "Building a Complete SaaS in Public",
];

const STATUSES: EarningVideo["status"][] = ["Viral", "Growing", "Stable"];
const FORMATS: EarningVideo["format"][] = ["long", "short", "live", "long", "short", "long"];

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
  if (cleaned.endsWith("M")) return Number.parseFloat(cleaned) * 1_000_000;
  if (cleaned.endsWith("K")) return Number.parseFloat(cleaned) * 1_000;
  return Number.parseFloat(cleaned) || 0;
}

function round(n: number): number {
  return Math.round(n);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function pickDelta(rand: () => number, spread = 18): { text: string; positive: boolean } {
  const value = (rand() * 2 - 0.35) * spread;
  const positive = value >= 0;
  return { text: `${positive ? "+" : ""}${value.toFixed(1)}%`, positive };
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
    values.push(round(current * 100) / 100);
  }
  return values;
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

export function formatUsdCompact(value: number): string {
  if (value >= 1_000_000) {
    const scaled = value / 1_000_000;
    return `$${scaled % 1 === 0 ? scaled.toFixed(0) : scaled.toFixed(1)}M`;
  }
  if (value >= 10_000) {
    const scaled = value / 1_000;
    return `$${scaled % 1 === 0 ? scaled.toFixed(0) : scaled.toFixed(1)}K`;
  }
  return formatUsd(value);
}

export function formatRate(value: number): string {
  return `$${value.toFixed(2)}`;
}

function rangeMultiplier(range: AnalyticsRange): number {
  if (range === "7d") return 8;
  if (range === "90d") return 52;
  return 26;
}

function labelsFor(range: AnalyticsRange): string[] {
  if (range === "7d") return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  if (range === "90d") return ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
  return ["Week 1", "Week 2", "Week 3", "Week 4"];
}

function dailyLabels(): string[] {
  return Array.from({ length: 12 }, (_, i) => `Nov ${1 + i * 2}`);
}

function buildVideos(rand: () => number, periodRevenue: number, views: number): EarningVideo[] {
  return VIDEO_TITLES.map((title, index) => {
    const share = Math.max(0.02, 0.22 - index * 0.014);
    const revenueValue = periodRevenue * share * (0.75 + rand() * 0.5);
    const videoViews = views * Math.max(0.03, 0.16 - index * 0.01) * (0.8 + rand() * 0.4);
    const rpm = clamp(3.8 + rand() * 6.5 - index * 0.12, 2.4, 14);
    const cpm = rpm * (1.35 + rand() * 0.45);
    const delta = pickDelta(rand, 36);
    const trend = seriesFrom(rand, 8, 40, 12, delta.positive ? 0.08 : -0.05);
    return {
      id: `vid-${index + 1}`,
      title,
      published: `${2 + index * 3} days ago`,
      duration: `${8 + round(rand() * 10)}:${String(round(rand() * 59)).padStart(2, "0")}`,
      views: formatCount(round(videoViews)),
      viewsToday: `+${formatCount(round(videoViews * 0.012))} today`,
      revenue: formatUsd(revenueValue),
      revenueValue,
      rpm: formatRate(rpm),
      cpm: formatRate(cpm),
      ctr: `${(4.2 + rand() * 5.5).toFixed(1)}%`,
      watchTime: `${formatCount(round(videoViews * 0.011))} hrs`,
      status: STATUSES[index % STATUSES.length] ?? "Stable",
      trend,
      trendUp: delta.positive,
      format: FORMATS[index % FORMATS.length] ?? "long",
      delta: delta.text,
      positive: delta.positive,
    };
  });
}

const cache = new Map<string, MonetizationData>();

export function getMonetizationData(
  channel: ChannelStatus,
  range: AnalyticsRange = "28d",
): MonetizationData {
  const key = `${channel.id}:${range}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const rand = mulberry32(hashString(`monetization:${channel.id}:${range}`));
  const views = parseCompact(channel.views);
  const channelRevenue = parseCompact(channel.revenue);
  const periodRevenue = Math.max(1200, channelRevenue * rangeMultiplier(range) * (0.92 + rand() * 0.16));
  const prevRevenue = periodRevenue / (1.08 + rand() * 0.12);
  const rpm = 4.2 + rand() * 4.4;
  const cpm = rpm * (1.4 + rand() * 0.35);
  const playbacks = views * (0.62 + rand() * 0.12);
  const labels = labelsFor(range);
  const daily = dailyLabels();
  const videos = buildVideos(rand, periodRevenue, views);
  const revDelta = pickDelta(rand, 20);
  const rpmDelta = pickDelta(rand, 12);
  const cpmDelta = pickDelta(rand, 10);
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 28;

  const sources = shareList(
    [
      { label: "Ad Revenue", color: "bg-accent", hex: HEX.accent },
      { label: "Memberships", color: "bg-chart-purple", hex: HEX.purple },
      { label: "Super Chat", color: "bg-chart-blue", hex: HEX.sky },
      { label: "Merchandise", color: "bg-success", hex: HEX.success },
    ],
    [78 + rand() * 6, 11 + rand() * 4, 5 + rand() * 2, 2 + rand() * 2],
  );

  const formatMeta: Omit<AdFormatRow, "revenue" | "revenueValue" | "share" | "cpm" | "delta" | "positive">[] = [
    {
      id: "skippable",
      label: "Skippable Video Ads",
      subtitle: "Pre-roll, mid-roll, post-roll",
      badge: "Top Earner",
      badgeTone: "success",
      color: "bg-success",
      hex: HEX.success,
    },
    {
      id: "nonskip",
      label: "Non-Skippable Ads",
      subtitle: "15–20 second ads",
      badge: "High CPM",
      badgeTone: "amber",
      color: "bg-chart-amber",
      hex: HEX.amber,
    },
    {
      id: "bumper",
      label: "Bumper Ads",
      subtitle: "6 second non-skippable",
      badge: "Growing",
      badgeTone: "accent",
      color: "bg-chart-purple",
      hex: HEX.purple,
    },
    {
      id: "display",
      label: "Display Ads",
      subtitle: "Sidebar & banner ads",
      badge: "Stable",
      badgeTone: "blue",
      color: "bg-chart-blue",
      hex: HEX.blue,
    },
    {
      id: "overlay",
      label: "Overlay Ads",
      subtitle: "Semi-transparent banners",
      badge: "Declining",
      badgeTone: "muted",
      color: "bg-accent",
      hex: HEX.pink,
    },
    {
      id: "sponsored",
      label: "Sponsored Cards",
      subtitle: "Interactive product cards",
      badge: "New",
      badgeTone: "accent",
      color: "bg-success",
      hex: HEX.sky,
    },
  ];

  const formatWeights = [0.58, 0.205, 0.089, 0.06, 0.03, 0.021];
  const adFormats: AdFormatRow[] = formatMeta.map((item, index) => {
    const weight = formatWeights[index] ?? 0.02;
    const revenueValue = periodRevenue * 0.805 * weight;
    const d = pickDelta(rand, index === 4 ? 10 : 28);
    return {
      ...item,
      revenue: formatUsd(revenueValue),
      revenueValue,
      share: Math.round(weight * 1000) / 10,
      cpm: formatRate(index === 1 ? 16 + rand() * 4 : Math.max(2.1, 12 - index * 1.4 + rand() * 2)),
      delta: d.text,
      positive: index === 4 ? false : d.positive,
    };
  });

  const formatShares = shareList(
    adFormats.map((item) => ({ label: item.label, color: item.color, hex: item.hex })),
    adFormats.map((item) => item.share),
  );

  function revenueTrend(length: number, labelList: string[], grain: number): TrendBlock {
    return {
      labels: labelList,
      series: [
        {
          label: "Revenue",
          hex: HEX.accent,
          values: seriesFrom(rand, length, periodRevenue / grain, periodRevenue / (grain * 6), 0.05),
        },
        {
          label: "Previous Period",
          hex: HEX.purple,
          values: seriesFrom(rand, length, prevRevenue / grain, prevRevenue / (grain * 6), 0.02),
        },
      ],
    };
  }

  function rpmTrend(length: number, labelList: string[]): TrendBlock {
    return {
      labels: labelList,
      series: [
        {
          label: "RPM",
          hex: HEX.success,
          values: seriesFrom(rand, length, rpm, 0.35, 0.03),
        },
        {
          label: "CPM",
          hex: HEX.purple,
          values: seriesFrom(rand, length, cpm, 0.42, 0.02),
        },
      ],
    };
  }

  const header: DeltaStat[] = [
    {
      label: "Total Revenue",
      value: formatUsdCompact(periodRevenue),
      delta: revDelta.text,
      positive: revDelta.positive,
      hint: "Est. Revenue",
    },
    {
      label: "Estimated Revenue",
      value: formatUsdCompact(periodRevenue * 1.06),
      delta: pickDelta(rand, 14).text,
      positive: true,
      hint: `${formatInt(round(280 + rand() * 80))} videos`,
    },
    {
      label: "Average RPM",
      value: formatRate(rpm),
      delta: rpmDelta.text,
      positive: rpmDelta.positive,
      hint: "Per 1,000 views",
    },
    {
      label: "Average CPM",
      value: formatRate(cpm),
      delta: cpmDelta.text,
      positive: cpmDelta.positive,
      hint: "Per 1,000 views",
    },
  ];

  const data: MonetizationData = {
    channel,
    range,
    header,
    overview: {
      revenueTrendDaily: revenueTrend(daily.length, daily, 22),
      revenueTrendWeekly: revenueTrend(labels.length, labels, labels.length),
      revenueTrendMonthly: revenueTrend(6, ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"], 6),
      sources,
      adIncome: [
        {
          label: "Watch Page Ads",
          value: formatUsd(periodRevenue * 0.58),
          ...pickDelta(rand, 16),
          delta: pickDelta(rand, 16).text,
          positive: true,
        },
        {
          label: "Shorts Feed Ads",
          value: formatUsd(periodRevenue * 0.21),
          ...pickDelta(rand, 40),
        },
        {
          label: "YouTube Premium",
          value: formatUsd(periodRevenue * 0.13),
          ...pickDelta(rand, 10),
        },
        {
          label: "Super Thanks",
          value: formatUsd(periodRevenue * 0.065),
          ...pickDelta(rand, 8),
        },
      ].map((item) => ({
        label: item.label,
        value: item.value,
        delta: item.text,
        positive: item.positive,
      })),
      topVideos: videos.slice(0, 6),
      adFormatBars: formatShares,
      regions: [
        { label: "United States", flag: "🇺🇸", color: "bg-accent", share: 36 },
        { label: "United Kingdom", flag: "🇬🇧", color: "bg-chart-purple", share: 16 },
        { label: "Canada", flag: "🇨🇦", color: "bg-chart-blue", share: 12 },
        { label: "Australia", flag: "🇦🇺", color: "bg-success", share: 10 },
        { label: "Germany", flag: "🇩🇪", color: "bg-chart-amber", share: 9 },
        { label: "India", flag: "🇮🇳", color: "bg-accent", share: 8 },
      ].map((row) => ({
        label: row.label,
        flag: row.flag,
        color: row.color,
        value: row.share,
        amount: formatUsdCompact(periodRevenue * (row.share / 100)),
      })),
      memberships: [
        {
          name: "VIP Tier",
          price: "$24.99/mo",
          revenue: formatUsd(periodRevenue * 0.072),
          members: `${formatCount(round(1200 + rand() * 900))} members`,
          color: "bg-chart-amber/15 text-chart-amber",
          icon: "crown",
        },
        {
          name: "Pro Tier",
          price: "$9.99/mo",
          revenue: formatUsd(periodRevenue * 0.04),
          members: `${formatCount(round(3200 + rand() * 1600))} members`,
          color: "bg-chart-purple/15 text-chart-purple",
          icon: "star",
        },
        {
          name: "Supporter",
          price: "$4.99/mo",
          revenue: formatUsd(periodRevenue * 0.012),
          members: `${formatCount(round(4800 + rand() * 2200))} members`,
          color: "bg-accent/15 text-accent",
          icon: "heart",
        },
      ],
      supporters: [
        { name: "Jordan_Creates", highlight: true },
        { name: "MayaEdits", highlight: false },
        { name: "PixelForge", highlight: false },
        { name: "NovaClips", highlight: false },
      ].map((row, index) => ({
        rank: index + 1,
        name: row.name,
        count: `${round(28 - index * 6 + rand() * 4)} Super Chats`,
        amount: formatUsd(420 - index * 90 + rand() * 40),
        highlight: row.highlight,
      })),
      transactions: [
        { label: "Ad Revenue Payout", kind: "payout" as const, positive: true, factor: 0.26 },
        { label: "Membership Renewal", kind: "membership" as const, positive: true, factor: 0.018 },
        { label: "Super Chat — Live Stream", kind: "superchat" as const, positive: true, factor: 0.003 },
        { label: "Merch Store Sale", kind: "merch" as const, positive: true, factor: 0.0018 },
        { label: "Platform Fee", kind: "fee" as const, positive: false, factor: 0.009 },
      ].map((row, index) => ({
        label: row.label,
        kind: row.kind,
        positive: row.positive,
        date: `Nov ${21 - index}, 2026`,
        amount: `${row.positive ? "+" : "-"}${formatUsd(periodRevenue * row.factor)}`,
      })),
    },
    rpmCpm: {
      cards: [
        {
          label: "Revenue Per Mille (RPM)",
          value: formatRate(rpm),
          delta: rpmDelta.text,
          positive: rpmDelta.positive,
          hint: `vs ${formatRate(rpm * 0.89)} last period`,
          progress: clamp(round((rpm / 6.2) * 100), 48, 96),
          progressLabel: `${clamp(round((rpm / 6.2) * 100), 48, 96)}% of target (${formatRate(6.2)})`,
        },
        {
          label: "Cost Per Mille (CPM)",
          value: formatRate(cpm),
          delta: cpmDelta.text,
          positive: cpmDelta.positive,
          hint: `vs ${formatRate(cpm * 0.92)} last period`,
          progress: clamp(round((cpm / 8.5) * 100), 52, 96),
          progressLabel: `${clamp(round((cpm / 8.5) * 100), 52, 96)}% of target (${formatRate(8.5)})`,
        },
        {
          label: "Estimated Revenue",
          value: formatUsdCompact(periodRevenue),
          delta: revDelta.text,
          positive: revDelta.positive,
          hint: range === "7d" ? "Last 7 days" : range === "90d" ? "Last 90 days" : "Last 28 days",
          progress: 72,
          progressLabel: `Daily avg: ${formatUsd(periodRevenue / days)}`,
        },
        {
          label: "Monetized Playbacks",
          value: formatCount(round(playbacks)),
          delta: pickDelta(rand, 18).text,
          positive: true,
          hint: `${round(62 + rand() * 10)}% playback rate`,
          progress: 68,
          progressLabel: `Ad impressions: ${formatCount(round(playbacks * 1.55))}`,
        },
      ],
      trend7: rpmTrend(7, ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"]),
      trend28: rpmTrend(labels.length, labels),
      trend90: rpmTrend(6, ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"]),
      breakdown: sources,
      insights: [
        {
          title: "High RPM opportunity",
          body: "Your tech review videos earn 35% higher RPM. Consider creating more content in this niche.",
          badge: "+35% RPM",
        },
        {
          title: "Optimal upload time",
          body: "Videos uploaded between 2–4 PM EST show 22% higher CPM rates based on your audience data.",
          badge: "+22% CPM",
        },
        {
          title: "Video length sweet spot",
          body: "12–15 minute videos perform best for mid-roll ads. Your avg is 8 mins — consider longer content.",
          badge: "Mid-roll potential",
        },
      ],
      topRpmVideos: [...videos].sort((a, b) => parseCompact(b.rpm) - parseCompact(a.rpm)).slice(0, 6),
    },
    topVideos: {
      stats: [
        {
          label: "Total Revenue (30d)",
          value: formatUsdCompact(periodRevenue),
          delta: `${revDelta.text} vs last month`,
          positive: revDelta.positive,
          progress: 78,
          progressLabel: "of monthly goal",
        },
        {
          label: "Top Video Revenue",
          value: videos[0]?.revenue ?? "$0",
          delta: "#1 earner",
          positive: true,
          progress: 85,
          progressLabel: "of monthly goal",
        },
        {
          label: "Average RPM",
          value: formatRate(rpm),
          delta: `+${formatRate(0.35 + rand() * 0.2)} vs last month`,
          positive: true,
          progress: 72,
          progressLabel: "of monthly goal",
        },
        {
          label: "Videos Monetized",
          value: formatInt(round(280 + rand() * 70)),
          delta: "98% eligible",
          positive: true,
          progress: 98,
          progressLabel: `${round(240 + rand() * 40)} ads enabled`,
        },
      ],
      leaderboard: videos.slice(0, 3),
      breakdown: sources,
      videos,
      liveLeaderboard: videos.slice(0, 5),
      trend: revenueTrend(6, ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], 6),
      categories: [
        { label: "Tutorials", color: "bg-accent", share: 0.38 },
        { label: "Reviews", color: "bg-chart-purple", share: 0.26 },
        { label: "Vlogs", color: "bg-chart-blue", share: 0.2 },
        { label: "Gaming", color: "bg-success", share: 0.16 },
      ].map((row) => ({
        label: row.label,
        color: row.color,
        value: round(row.share * 100),
        amount: formatUsdCompact(periodRevenue * row.share),
      })),
    },
    adFormats: {
      formatBars: adFormats.map((item) => ({
        label: item.label.replace(" Ads", "").replace(" Video", ""),
        value: round(item.revenueValue),
        hex: item.hex,
      })),
      distribution: formatShares,
      cards: adFormats,
    },
  };

  cache.set(key, data);
  return data;
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
