import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { channelAccessWhere } from "@/lib/youtube/access";
import { resolveActiveChannelId } from "@/lib/youtube/activeChannel";
import {
  asAnalyticsRange,
  loadChannelAnalytics,
  type AnalyticsDay,
} from "@/lib/youtube/analytics";
import { formatDuration, timeAgo } from "@/lib/youtube/format";
import { formatHourLabel, postingHeatmap, topPostingSlots } from "@/lib/youtube/postingTimes";
import { listChannels, type ConnectedChannel } from "@/lib/youtube/repo";
import {
  formatCount,
  type CalendarEvent,
  type ChartMetric,
  type OverviewPrimaryStat,
  type RecentUpload,
  type ScheduledVideo,
  type SchedulerStatCardData,
  type UpcomingUpload,
} from "@/lib/dashboardContent";
import type { LibraryPlaylist, LibraryVideo } from "@/lib/contentLibrary";

const BAR_COLORS = ["bg-accent", "bg-chart-blue", "bg-chart-purple", "bg-chart-amber", "bg-success", "bg-muted"];
const AGE_COLORS = ["#3b82f6", "#a855f7", "#fb7185", "#22c55e", "#f59e0b", "#38bdf8"];

export type OverviewPayload = {
  channel: ConnectedChannel | null;
  analyticsError: string | null;
  monetaryAvailable: boolean;
  primary: OverviewPrimaryStat[];
  secondary: { label: string; value: string; delta: string; positive: boolean }[];
  traffic: { label: string; value: number; color: string }[];
  countries: { label: string; value: number; color: string; flag: string }[];
  uploads: RecentUpload[];
  scheduled: ScheduledVideo[];
  series: Record<ChartMetric, { labels: string[]; values: number[] }>;
  audience: { total: string; segments: { label: string; value: number; color: string }[] };
};

export async function loadOverview(
  user: SessionUser,
  rangeInput?: string | null,
  options: { refresh?: boolean } = {},
): Promise<OverviewPayload> {
  const channels = await listChannels(user);
  const activeId = await resolveActiveChannelId(user, channels);
  const channel = channels.find((item) => item.id === activeId) ?? null;
  if (!channel) return emptyOverview(null);

  const range = asAnalyticsRange(rangeInput);
  const analytics = await loadChannelAnalytics(user, channel.id, range, options);

  const [videos, engagement] = await Promise.all([
    prisma.youtubeVideo.findMany({
      where: { channelId: channel.id },
      orderBy: { publishedAt: "desc" },
      take: 24,
    }),
    prisma.youtubeVideo.aggregate({
      where: { channelId: channel.id },
      _sum: { likeCount: true, commentCount: true },
    }),
  ]);
  const drafts = await prisma.videoSession.findMany({
    where: { userId: user.id, deletedAt: null, status: "DRAFT", youtubeVideoId: null, channelId: channel.id },
    orderBy: { updatedAt: "desc" },
    take: 8,
    select: { id: true, name: true, updatedAt: true, approvedStepCount: true, timelineSeconds: true },
  });

  const current = sumDays(analytics.days);
  const previous = sumDays(analytics.previousDays);
  const likes = Number(engagement._sum.likeCount ?? 0);
  const comments = Number(engagement._sum.commentCount ?? 0);

  return {
    channel,
    analyticsError: analytics.error,
    monetaryAvailable: analytics.monetaryAvailable,
    primary: [
      stat("views", "Views", formatCount(channel.viewCount), delta(current.views, previous.views), "views", "accent", spark(analytics.days, (day) => day.views)),
      stat(
        "subs",
        "Subscribers",
        channel.hiddenSubscriberCount ? "Hidden" : formatCount(channel.subscriberCount),
        current.subscribersGained ? `+${formatCount(current.subscribersGained)} this period` : "No new subscribers",
        "subs",
        "chart-blue",
        spark(analytics.days, (day) => day.subscribersGained),
      ),
      stat(
        "watch",
        "Watch time",
        analytics.lifetimeWatchMinutes != null
          ? formatWatchTime(analytics.lifetimeWatchMinutes)
          : analytics.days.length
            ? formatWatchTime(current.watchMinutes)
            : "—",
        analytics.days.length
          ? `${formatWatchTime(current.watchMinutes)} this period`
          : "Analytics unavailable",
        "watch",
        "success",
        spark(analytics.days, (day) => day.watchMinutes),
      ),
      stat(
        "revenue",
        "Revenue",
        analytics.monetaryAvailable ? formatMoney(current.revenue) : "—",
        analytics.monetaryAvailable
          ? delta(current.revenue, previous.revenue)
          : analytics.error
            ? "Analytics unavailable"
            : "Not in YouTube Partner Program",
        "revenue",
        "chart-purple",
        spark(analytics.days, (day) => day.estimatedRevenue ?? 0),
      ),
    ],
    secondary: [
      secondary("Likes", formatCount(likes), thisPeriod(current.likes, previous.likes)),
      secondary("Comments", formatCount(comments), thisPeriod(current.comments, previous.comments)),
      secondary(
        "Shares",
        analytics.days.length ? formatCount(current.shares) : "—",
        analytics.days.length
          ? thisPeriod(current.shares, previous.shares)
          : { text: "Not returned for this channel", positive: true },
      ),
      secondary("Avg. CTR", formatCtr(current), delta(current.ctr, previous.ctr)),
      secondary("Impressions", analytics.impressionsAvailable ? formatCount(current.impressions) : "—", delta(current.impressions, previous.impressions)),
      secondary("Unique viewers", "—", { text: "Not returned by YouTube", positive: true }),
    ],
    traffic: toBars(analytics.traffic),
    countries: analytics.countries.map((item) => ({
      label: item.label,
      value: sharePercent(analytics.countries, item.value),
      color: "bg-success",
      flag: flagEmoji(item.code ?? ""),
    })),
    uploads: [
      ...videos.slice(0, 8).map((video) => toRecentUpload(video)),
      ...drafts.map((draft) => ({
        id: draft.id,
        title: draft.name,
        duration: formatDuration(draft.timelineSeconds || null),
        status: "draft" as const,
        meta: `Edited ${timeAgo(draft.updatedAt.toISOString())}`,
        draftProgress: Math.min(100, Math.round((draft.approvedStepCount / 8) * 100)),
      })),
    ],
    scheduled: videos
      .filter((video) => video.publishAt && video.publishAt.getTime() > Date.now())
      .map((video) => toScheduled(video)),
    series: {
      views: chartSeries(analytics.days, (day) => day.views),
      engagement: chartSeries(analytics.days, (day) => day.likes + day.comments + day.shares),
      revenue: chartSeries(analytics.days, (day) => day.estimatedRevenue ?? 0),
    },
    audience: {
      total: channel.hiddenSubscriberCount ? "Hidden" : formatCount(channel.subscriberCount),
      segments: analytics.ages.map((item, index) => ({
        label: item.label,
        value: Math.round(item.value),
        color: AGE_COLORS[index % AGE_COLORS.length] ?? "#3b82f6",
      })),
    },
  };
}

export async function loadLibrary(user: SessionUser): Promise<{
  channels: { id: string; name: string }[];
  videos: LibraryVideo[];
  playlists: LibraryPlaylist[];
}> {
  const channels = await listChannels(user);
  const channelIds = channels.map((channel) => channel.id);
  const names = new Map(channels.map((channel) => [channel.id, channel.title]));
  const [videos, drafts, playlists] = await Promise.all([
    prisma.youtubeVideo.findMany({
      where: { channelId: { in: channelIds } },
      orderBy: { publishedAt: "desc" },
      take: 200,
    }),
    prisma.videoSession.findMany({
      where: { userId: user.id, deletedAt: null, status: "DRAFT", youtubeVideoId: null },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.youtubePlaylist.findMany({
      where: { channelId: { in: channelIds } },
      orderBy: { publishedAt: "desc" },
    }),
  ]);

  return {
    channels: channels.map((channel) => ({ id: channel.id, name: channel.title })),
    videos: [
      ...videos.map((video) => {
        const scheduled = Boolean(video.publishAt && video.publishAt.getTime() > Date.now());
        return {
          id: video.id,
          title: video.title,
          channelId: video.channelId,
          channelName: names.get(video.channelId) ?? "Channel",
          status: scheduled ? "scheduled" : "published",
          duration: formatDuration(video.durationSec),
          publishedDate: video.publishedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          relativeTime: timeAgo(video.publishedAt.toISOString()),
          views: formatCount(Number(video.viewCount)),
          likes: formatCount(Number(video.likeCount)),
          comments: formatCount(Number(video.commentCount)),
          revenue: "—",
          thumbLabel: video.title,
          thumbnailUrl: video.thumbnailUrl,
          watchHref: `https://www.youtube.com/watch?v=${video.videoId}`,
        } satisfies LibraryVideo;
      }),
      ...drafts.map((draft) => ({
        id: draft.id,
        title: draft.name,
        channelId: draft.channelId ?? "none",
        channelName: draft.channelTitle ?? "No channel",
        status: "draft" as const,
        duration: formatDuration(draft.timelineSeconds || null),
        publishedDate: draft.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        relativeTime: timeAgo(draft.updatedAt.toISOString()),
        views: "—",
        likes: "—",
        comments: "—",
        revenue: "—",
        thumbLabel: draft.name,
        editHref: `/dashboard/create/${draft.id}`,
      }) satisfies LibraryVideo),
    ],
    playlists: playlists.map((playlist) => ({
      id: playlist.id,
      title: playlist.title,
      description: playlist.description,
      channelId: playlist.channelId,
      channelName: names.get(playlist.channelId) ?? "Channel",
      status: playlist.privacyStatus === "public" ? "ready" : playlist.privacyStatus === "unlisted" ? "review" : "editing",
      visibility: playlist.privacyStatus === "public" ? "public" : "private",
      videoCount: playlist.itemCount,
      views: "—",
      watchTime: "—",
      updatedLabel: playlist.publishedAt ? timeAgo(playlist.publishedAt.toISOString()) : "Synced",
      thumbLabels: [playlist.title, playlist.title, playlist.title, playlist.title],
      thumbnailUrl: playlist.thumbnailUrl,
    })),
  };
}

export type SchedulerPayload = {
  channelTitle: string | null;
  calendarCards: SchedulerStatCardData[];
  upcomingCards: SchedulerStatCardData[];
  bestTimeCards: SchedulerStatCardData[];
  events: CalendarEvent[];
  uploads: UpcomingUpload[];
  nextUploadOffsetMs: number | null;
  heatmap: Record<"sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat", number[]>;
  bars: { label: string; value: number; color: string }[];
  slots: { rank: number; day: string; time: string; viewers: string; tone: "success" | "chart-blue" | "chart-amber" | "accent" }[];
  insight: string;
};

export async function loadScheduler(user: SessionUser): Promise<SchedulerPayload> {
  const channels = await listChannels(user);
  const activeId = await resolveActiveChannelId(user, channels);
  const channel = channels.find((item) => item.id === activeId) ?? null;
  const videos = channel
    ? await prisma.youtubeVideo.findMany({
        where: { channelId: channel.id },
        orderBy: { publishedAt: "desc" },
      })
    : [];
  const scheduled = videos.filter((video) => video.publishAt && video.publishAt.getTime() > Date.now());
  const processing = videos.filter((video) => video.uploadStatus === "uploaded");
  const next = scheduled
    .map((video) => video.publishAt!.getTime())
    .sort((a, b) => a - b)[0];
  const posting = videos.map((video) => ({
    publishedAt: video.publishedAt.toISOString(),
    viewCount: Number(video.viewCount),
  }));
  const slots = topPostingSlots(posting);
  const best = slots[0];
  const heatmap = postingHeatmap(posting);
  const maxViews = Math.max(...slots.map((slot) => slot.views), 1);

  return {
    channelTitle: channel?.title ?? null,
    calendarCards: [
      card("scheduled", "Scheduled Videos", String(scheduled.length), "calendar", "This channel", "accent"),
      card("premieres", "Premieres", "0", "camera", "Not in Data API", "chart-purple"),
      card("lives", "Live Streams", "0", "broadcast", "Not scheduled here", "chart-amber"),
      card("processing", "Processing", String(processing.length), "processing", "Upload status", "chart-blue"),
    ],
    upcomingCards: [
      card("scheduled", "Scheduled Videos", String(scheduled.length), "upload", "publishAt", "chart-blue"),
      card("ready", "Ready to Publish", "0", "check", "Rendered in the app", "success"),
      card("processing", "Being Processed", String(processing.length), "processing", "YouTube processing", "chart-amber"),
      card("next-up", "Until Next Upload", "", "clock", "Next scheduled video", "accent"),
    ],
    bestTimeCards: [
      card("best-day", "Best Day", best?.day ?? "—", "day", "Weighted by views", "success", "From videos already published"),
      card("best-time", "Best Time", best ? formatHourLabel(best.hour) : "—", "time", "UTC", "chart-blue", best ? `${formatCount(best.views)} views` : "Sync the channel first"),
      card("samples", "Videos sampled", String(videos.length), "eye", "Uploads", "chart-amber"),
      card("note", "Source", "Publish hour", "ai", "Not live audience", "accent", "YouTube Analytics has no hour dimension"),
    ],
    events: scheduled.map((video) => {
      const when = video.publishAt!;
      return {
        id: video.id,
        year: when.getFullYear(),
        month: when.getMonth(),
        day: when.getDate(),
        title: video.title,
        time: when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        kind: "scheduled" as const,
        panel: true,
      };
    }),
    uploads: scheduled.map((video) => ({
      id: video.id,
      title: video.title,
      duration: formatDuration(video.durationSec),
      status: "scheduled" as const,
      scheduledLabel: video.publishAt!.toLocaleString(),
    })),
    nextUploadOffsetMs: next ? Math.max(0, next - Date.now()) : null,
    heatmap,
    bars: slots.map((slot, index) => ({
      label: `${slot.day} ${formatHourLabel(slot.hour)}`,
      value: Math.round((slot.views / maxViews) * 100),
      color: BAR_COLORS[index % BAR_COLORS.length] ?? "bg-accent",
    })),
    slots: slots.map((slot, index) => ({
      rank: index + 1,
      day: slot.day,
      time: formatHourLabel(slot.hour),
      viewers: formatCount(slot.views),
      tone: (["success", "chart-blue", "chart-amber", "accent"] as const)[index] ?? "accent",
    })),
    insight: best
      ? `${best.day} at ${formatHourLabel(best.hour)} has the most views among this channel's published videos. This ranks publish time, not live audience activity.`
      : channel
        ? "Sync this channel to rank publish times from its videos."
        : "Connect a YouTube channel to see a posting schedule.",
  };
}

export async function countNavBadges(user: SessionUser): Promise<{ drafts: number; upcoming: number }> {
  const [drafts, upcoming] = await Promise.all([
    prisma.videoSession.count({
      where: { userId: user.id, deletedAt: null, status: "DRAFT", youtubeVideoId: null },
    }),
    prisma.youtubeVideo.count({
      where: { publishAt: { gt: new Date() }, channel: { is: channelAccessWhere(user) } },
    }),
  ]);
  return { drafts, upcoming };
}

function emptyOverview(channel: ConnectedChannel | null): OverviewPayload {
  const blank = { labels: [] as string[], values: [] as number[] };
  return {
    channel,
    analyticsError: null,
    monetaryAvailable: false,
    primary: [],
    secondary: [],
    traffic: [],
    countries: [],
    uploads: [],
    scheduled: [],
    series: { views: blank, engagement: blank, revenue: blank },
    audience: { total: "0", segments: [] },
  };
}

function sumDays(days: AnalyticsDay[]) {
  const impressions = days.reduce((sum, day) => sum + (day.impressions ?? 0), 0);
  const weightedCtr = days.reduce((sum, day) => sum + (day.ctr ?? 0) * (day.impressions ?? 0), 0);
  return {
    views: days.reduce((sum, day) => sum + day.views, 0),
    watchMinutes: days.reduce((sum, day) => sum + day.watchMinutes, 0),
    likes: days.reduce((sum, day) => sum + day.likes, 0),
    comments: days.reduce((sum, day) => sum + day.comments, 0),
    shares: days.reduce((sum, day) => sum + day.shares, 0),
    subscribersGained: days.reduce((sum, day) => sum + day.subscribersGained, 0),
    revenue: days.reduce((sum, day) => sum + (day.estimatedRevenue ?? 0), 0),
    impressions,
    ctr: impressions > 0 ? weightedCtr / impressions : 0,
  };
}

function thisPeriod(
  current: number,
  previous: number,
): { text: string; positive: boolean } {
  const change = delta(current, previous);
  if (!current && !previous) return { text: "None this period", positive: true };
  return { text: `${formatCount(current)} this period`, positive: change.positive };
}

function delta(current: number, previous: number): { text: string; positive: boolean } {
  if (!previous && !current) return { text: "No change", positive: true };
  if (!previous) return { text: "New", positive: true };
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(change * 10) / 10;
  return { text: `${rounded > 0 ? "+" : ""}${rounded}%`, positive: rounded >= 0 };
}

function stat(
  id: string,
  label: string,
  value: string,
  change: { text: string; positive: boolean } | string,
  icon: OverviewPrimaryStat["icon"],
  accent: OverviewPrimaryStat["accent"],
  sparkline: number[],
): OverviewPrimaryStat {
  const parsed = typeof change === "string" ? { text: change, positive: true } : change;
  return { id, label, value, delta: parsed.text, positive: parsed.positive, icon, accent, sparkline };
}

function secondary(label: string, value: string, change: { text: string; positive: boolean }) {
  return { label, value, delta: change.text, positive: change.positive };
}

function spark(days: AnalyticsDay[], pick: (day: AnalyticsDay) => number): number[] {
  const values = days.map(pick);
  if (values.length <= 12) return values.length ? values : [0];
  const bucket = Math.ceil(values.length / 12);
  const points: number[] = [];
  for (let i = 0; i < values.length; i += bucket) {
    const slice = values.slice(i, i + bucket);
    points.push(slice.reduce((sum, value) => sum + value, 0) / slice.length);
  }
  return points;
}

function chartSeries(days: AnalyticsDay[], pick: (day: AnalyticsDay) => number) {
  const sampled = spark(days, pick);
  const labels = days.length <= 12
    ? days.map((day) => day.date.slice(5))
    : sampled.map((_, index) => `P${index + 1}`);
  return { labels, values: sampled };
}

function toBars(items: { label: string; value: number }[]) {
  return items.map((item, index) => ({
    label: item.label,
    value: sharePercent(items, item.value),
    color: BAR_COLORS[index % BAR_COLORS.length] ?? "bg-accent",
  }));
}

function sharePercent(items: { value: number }[], value: number): number {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function formatWatchTime(minutes: number): string {
  if (minutes < 60) {
    const rounded = Math.max(0, Math.round(minutes));
    if (minutes > 0 && rounded < 1) return "< 1 min";
    return `${rounded} min`;
  }
  const hours = minutes / 60;
  if (hours >= 1000) return `${formatCount(Math.round(hours))} hrs`;
  return `${Math.round(hours * 10) / 10} hrs`;
}

function formatMoney(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatCtr(current: { ctr: number; impressions: number }): string {
  if (!current.impressions) return "—";
  const percent = current.ctr <= 1 ? current.ctr * 100 : current.ctr;
  return `${Math.round(percent * 10) / 10}%`;
}

function flagEmoji(code: string): string {
  if (!/^[a-z]{2}$/i.test(code)) return "🌐";
  return String.fromCodePoint(...code.toUpperCase().split("").map((char) => 127397 + char.charCodeAt(0)));
}

function toRecentUpload(video: {
  id: string;
  title: string;
  durationSec: number | null;
  publishedAt: Date;
  publishAt: Date | null;
  viewCount: bigint;
  likeCount: bigint;
  commentCount: bigint;
  privacyStatus: string;
}): RecentUpload {
  const scheduled = Boolean(video.publishAt && video.publishAt.getTime() > Date.now());
  return {
    id: video.id,
    title: video.title,
    duration: formatDuration(video.durationSec),
    status: scheduled ? "scheduled" : "published",
    meta: scheduled
      ? `Publishes ${video.publishAt!.toLocaleString()}`
      : `${video.privacyStatus} · ${timeAgo(video.publishedAt.toISOString())}`,
    views: formatCount(Number(video.viewCount)),
    likes: formatCount(Number(video.likeCount)),
    comments: formatCount(Number(video.commentCount)),
    scheduledFor: video.publishAt?.toLocaleString(),
  };
}

function toScheduled(video: {
  id: string;
  title: string;
  durationSec: number | null;
  publishAt: Date | null;
}): ScheduledVideo {
  const when = video.publishAt ?? new Date();
  return {
    id: video.id,
    title: video.title,
    duration: formatDuration(video.durationSec),
    date: when.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    time: when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    status: "scheduled",
    aiScore: 0,
    aiLabel: "Good",
  };
}

function card(
  id: string,
  label: string,
  value: string,
  icon: SchedulerStatCardData["icon"],
  badge: string,
  tone: SchedulerStatCardData["badge"]["tone"],
  sub?: string,
): SchedulerStatCardData {
  return { id, label, value, icon, badge: { text: badge, tone }, sub };
}
