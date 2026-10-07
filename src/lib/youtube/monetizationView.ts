import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { formatCount, formatUsd, type ChannelStatus } from "@/lib/dashboardContent";
import type { AnalyticsRange, NamedShare } from "@/lib/channelAnalyticsContent";
import {
  formatRate,
  formatUsdCompact,
  type AdFormatRow,
  type EarningVideo,
  type MonetizationData,
} from "@/lib/monetizationContent";
import { asAnalyticsRange, loadChannelAnalytics, type AnalyticsBundle } from "@/lib/youtube/analytics";
import { resolveActiveChannelId } from "@/lib/youtube/activeChannel";
import { channelInitials, formatDuration, timeAgo } from "@/lib/youtube/format";
import { listChannels, type ConnectedChannel } from "@/lib/youtube/repo";

const COLORS = [
  { color: "bg-accent", hex: "#ff3b4e" },
  { color: "bg-chart-blue", hex: "#3b82f6" },
  { color: "bg-chart-purple", hex: "#a855f7" },
  { color: "bg-chart-amber", hex: "#f59e0b" },
  { color: "bg-success", hex: "#22c55e" },
  { color: "bg-muted", hex: "#94a3b8" },
];

type VideoMeta = {
  videoId: string;
  title: string;
  publishedAt: Date;
  durationSec: number | null;
};

export function monetizationFromAnalytics(
  channel: ConnectedChannel,
  channelStatus: ChannelStatus,
  range: AnalyticsRange,
  bundle: AnalyticsBundle,
  videos: VideoMeta[],
): MonetizationData {
  const byId = new Map(videos.map((video) => [video.videoId, video]));
  const views = bundle.days.reduce((sum, day) => sum + day.views, 0);
  const previousViews = bundle.previousDays.reduce((sum, day) => sum + day.views, 0);
  const revenue = bundle.days.reduce((sum, day) => sum + (day.estimatedRevenue ?? 0), 0);
  const previousRevenue = bundle.previousDays.reduce((sum, day) => sum + (day.estimatedRevenue ?? 0), 0);
  const watch = bundle.days.reduce((sum, day) => sum + day.watchMinutes, 0);
  const rpm = views > 0 && bundle.monetaryAvailable ? (revenue / views) * 1000 : 0;
  const previousRpm = previousViews > 0 && bundle.monetaryAvailable ? (previousRevenue / previousViews) * 1000 : 0;
  const earning = bundle.videos.map((row) => toEarning(row, byId.get(row.videoId), bundle.monetaryAvailable));
  const revenueTrend = trend(bundle, "Revenue", "#ff3b4e", (day) => day.estimatedRevenue ?? 0);
  const rateTrend = {
    labels: bundle.days.map((day) => day.date.slice(5)),
    series: [
      { label: "RPM", hex: "#22c55e", values: bundle.days.map((day) => (day.views ? ((day.estimatedRevenue ?? 0) / day.views) * 1000 : 0)) },
    ],
  };
  const adShares = toShares(bundle.adTypes);
  const countryShares = toShares(bundle.countries);
  const adRows = adFormatRows(bundle);
  const unavailable = bundle.monetaryAvailable ? "" : "YouTube did not return revenue for this channel.";

  return {
    channel: {
      ...channelStatus,
      revenue: bundle.monetaryAvailable ? formatUsdCompact(revenue) : "—",
      views: formatCount(views || channel.viewCount),
    },
    range,
    header: [
      {
        label: "Total Revenue",
        value: bundle.monetaryAvailable ? formatUsdCompact(revenue) : "—",
        delta: bundle.monetaryAvailable ? change(revenue, previousRevenue).text : "Not available",
        positive: change(revenue, previousRevenue).positive,
        hint: unavailable || "Estimated revenue",
      },
      {
        label: "Views",
        value: formatCount(views),
        delta: change(views, previousViews).text,
        positive: change(views, previousViews).positive,
        hint: `${bundle.startDate} – ${bundle.endDate}`,
      },
      {
        label: "Average RPM",
        value: bundle.monetaryAvailable ? formatRate(rpm) : "—",
        delta: bundle.monetaryAvailable ? change(rpm, previousRpm).text : "Not available",
        positive: change(rpm, previousRpm).positive,
        hint: "Revenue per 1,000 views",
      },
      {
        label: "Watch time",
        value: `${formatCount(Math.round(watch / 60))} hrs`,
        delta: bundle.error ? "Analytics error" : "This period",
        positive: !bundle.error,
        hint: bundle.error ?? "Estimated minutes watched",
      },
    ],
    overview: {
      revenueTrendDaily: revenueTrend,
      revenueTrendWeekly: revenueTrend,
      revenueTrendMonthly: revenueTrend,
      sources: bundle.monetaryAvailable
        ? [{ label: "Ad revenue", value: 100, color: "bg-accent", hex: "#ff3b4e" }]
        : [],
      adIncome: [],
      topVideos: earning,
      adFormatBars: adShares,
      regions: bundle.countries.slice(0, 6).map((item, index) => ({
        label: item.label,
        flag: flagEmoji(item.code ?? ""),
        value: share(bundle.countries, item.value),
        amount: `${formatCount(item.value)} views`,
        color: COLORS[index % COLORS.length]?.color ?? "bg-accent",
      })),
      memberships: [],
      supporters: [],
      transactions: [],
    },
    rpmCpm: {
      cards: [
        {
          label: "RPM",
          value: bundle.monetaryAvailable ? formatRate(rpm) : "—",
          delta: bundle.monetaryAvailable ? change(rpm, previousRpm).text : "Not available",
          positive: true,
          progress: Math.min(100, rpm * 8),
          progressLabel: "Per 1,000 views",
        },
        {
          label: "CPM",
          value: "—",
          delta: "Not returned",
          positive: true,
          progress: 0,
          progressLabel: "Needs ad impression cost",
        },
      ],
      trend7: rateTrend,
      trend28: rateTrend,
      trend90: rateTrend,
      breakdown: countryShares,
      insights: [
        {
          title: bundle.monetaryAvailable ? "Revenue is estimated" : "No revenue report",
          body: bundle.monetaryAvailable
            ? "Figures come from the YouTube Analytics estimatedRevenue metric for this channel and range."
            : "This channel did not return estimated revenue. That usually means it is outside the YouTube Partner Program, or the analytics scope still needs a reconnect.",
          badge: bundle.monetaryAvailable ? "Analytics" : "Unavailable",
        },
      ],
      topRpmVideos: [...earning].sort((a, b) => b.revenueValue - a.revenueValue).slice(0, 5),
    },
    topVideos: {
      stats: [
        {
          label: "Videos",
          value: String(earning.length),
          delta: "In this range",
          positive: true,
          progress: 100,
          progressLabel: "Sorted by views",
        },
      ],
      leaderboard: earning.slice(0, 5),
      breakdown: toShares(bundle.traffic),
      videos: earning,
      liveLeaderboard: [],
      trend: trend(bundle, "Views", "#3b82f6", (day) => day.views),
      categories: [],
    },
    adFormats: {
      formatBars: adRows.map((row) => ({ label: row.label, value: row.revenueValue, hex: row.hex })),
      distribution: adShares.length ? adShares : [{ label: "No ad data", value: 100, color: "bg-muted", hex: "#94a3b8" }],
      cards: adRows,
    },
  };
}

export async function loadMonetization(
  user: SessionUser,
  rangeInput?: string | null,
  options: { refresh?: boolean } = {},
): Promise<{ channel: ConnectedChannel | null; data: MonetizationData | null }> {
  const channels = await listChannels(user);
  const activeId = await resolveActiveChannelId(user, channels);
  const channel = channels.find((item) => item.id === activeId) ?? null;
  if (!channel) return { channel: null, data: null };
  const range = asAnalyticsRange(rangeInput === "1y" ? "90d" : rangeInput);
  const analyticsRange: AnalyticsRange = range === "1y" ? "90d" : range;
  const [bundle, videos] = await Promise.all([
    loadChannelAnalytics(user, channel.id, analyticsRange, options),
    prisma.youtubeVideo.findMany({
      where: { channelId: channel.id },
      select: { videoId: true, title: true, publishedAt: true, durationSec: true },
    }),
  ]);
  return {
    channel,
    data: monetizationFromAnalytics(channel, toChannelStatus(channel), analyticsRange, bundle, videos),
  };
}

function toChannelStatus(channel: ConnectedChannel): ChannelStatus {
  return {
    id: channel.id,
    name: channel.title,
    initials: channelInitials(channel.title) || "CH",
    color: "bg-accent",
    subscribers: channel.hiddenSubscriberCount ? "Hidden" : formatCount(channel.subscriberCount),
    views: formatCount(channel.viewCount),
    revenue: "—",
    connected: channel.status === "ACTIVE",
    lastSync: timeAgo(channel.lastSyncedAt),
  };
}

function toEarning(
  row: AnalyticsBundle["videos"][number],
  video: VideoMeta | undefined,
  monetary: boolean,
): EarningVideo {
  const revenueValue = monetary ? (row.estimatedRevenue ?? 0) : 0;
  const rpm = row.views > 0 && monetary ? (revenueValue / row.views) * 1000 : 0;
  return {
    id: row.videoId,
    title: video?.title ?? row.videoId,
    published: video ? timeAgo(video.publishedAt.toISOString()) : "—",
    duration: formatDuration(video?.durationSec ?? null),
    views: formatCount(row.views),
    viewsToday: "—",
    revenue: monetary ? formatUsd(revenueValue) : "—",
    revenueValue,
    rpm: monetary ? formatRate(rpm) : "—",
    cpm: "—",
    ctr: "—",
    watchTime: `${formatCount(Math.round(row.watchMinutes / 60))} hrs`,
    status: "Stable",
    trend: [row.views],
    trendUp: true,
    format: (video?.durationSec ?? 61) <= 60 ? "short" : "long",
    delta: "This period",
    positive: true,
  };
}

function adFormatRows(bundle: AnalyticsBundle): AdFormatRow[] {
  if (!bundle.adTypes.length) {
    return [
      {
        id: "none",
        label: "No ad format data",
        subtitle: bundle.monetaryAvailable
          ? "YouTube returned revenue without an ad type breakdown."
          : "YouTube did not return ad revenue for this channel.",
        revenue: "—",
        revenueValue: 0,
        share: 0,
        cpm: "—",
        badge: "Unavailable",
        badgeTone: "muted",
        delta: "—",
        positive: true,
        color: "bg-muted",
        hex: "#94a3b8",
      },
    ];
  }
  const total = bundle.adTypes.reduce((sum, item) => sum + item.value, 0) || 1;
  return bundle.adTypes.map((item, index) => {
    const tone = COLORS[index % COLORS.length] ?? COLORS[0];
    return {
      id: `${index}`,
      label: item.label,
      subtitle: "grossRevenue from YouTube Analytics",
      revenue: formatUsd(item.value),
      revenueValue: item.value,
      share: Math.round((item.value / total) * 1000) / 10,
      cpm: "—",
      badge: index === 0 ? "Top" : "Reported",
      badgeTone: index === 0 ? "success" : "muted",
      delta: "This period",
      positive: true,
      color: tone.color,
      hex: tone.hex,
    };
  });
}

function toShares(items: { label: string; value: number }[]): NamedShare[] {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  return items.map((item, index) => {
    const tone = COLORS[index % COLORS.length] ?? COLORS[0];
    return {
      label: item.label,
      value: Math.round((item.value / total) * 1000) / 10,
      color: tone.color,
      hex: tone.hex,
    };
  });
}

function share(items: { value: number }[], value: number): number {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function trend(
  bundle: AnalyticsBundle,
  label: string,
  hex: string,
  pick: (day: AnalyticsBundle["days"][number]) => number,
) {
  return {
    labels: bundle.days.map((day) => day.date.slice(5)),
    series: [{ label, hex, values: bundle.days.map(pick) }],
  };
}

function change(current: number, previous: number): { text: string; positive: boolean } {
  if (!previous) return { text: current ? "New" : "No change", positive: true };
  const rounded = Math.round((((current - previous) / Math.abs(previous)) * 100) * 10) / 10;
  return { text: `${rounded > 0 ? "+" : ""}${rounded}%`, positive: rounded >= 0 };
}

function flagEmoji(code: string): string {
  if (!/^[a-z]{2}$/i.test(code)) return "🌐";
  return String.fromCodePoint(...code.toUpperCase().split("").map((char) => 127397 + char.charCodeAt(0)));
}
