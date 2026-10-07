import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { requireChannelAccess } from "@/lib/youtube/access";
import { getAuthedClientForChannel } from "@/lib/youtube/oauth";
import { runWithYoutubeUsage, trackYoutubeCall } from "@/lib/youtube/usage";

export type AnalyticsRangeKey = "7d" | "28d" | "90d" | "1y";

export type AnalyticsDay = {
  date: string;
  views: number;
  watchMinutes: number;
  averageViewDuration: number;
  likes: number;
  comments: number;
  shares: number;
  subscribersGained: number;
  estimatedRevenue: number | null;
  impressions: number | null;
  ctr: number | null;
};

export type AnalyticsShare = {
  label: string;
  value: number;
  code?: string;
};

export type AnalyticsVideoRow = {
  videoId: string;
  views: number;
  watchMinutes: number;
  estimatedRevenue: number | null;
};

export type AnalyticsBundle = {
  range: AnalyticsRangeKey;
  startDate: string;
  endDate: string;
  monetaryAvailable: boolean;
  impressionsAvailable: boolean;
  /** All-time minutes from YouTube Analytics. Null when that query did not return. */
  lifetimeWatchMinutes: number | null;
  days: AnalyticsDay[];
  previousDays: AnalyticsDay[];
  countries: AnalyticsShare[];
  traffic: AnalyticsShare[];
  devices: AnalyticsShare[];
  ages: AnalyticsShare[];
  genders: AnalyticsShare[];
  adTypes: AnalyticsShare[];
  videos: AnalyticsVideoRow[];
  error: string | null;
};

const REPORT_KEY = "bundle";
const FRESH_MS = 3 * 60 * 60 * 1000;
const ERROR_FRESH_MS = 10 * 60 * 1000;

const TRAFFIC_LABELS: Record<string, string> = {
  YT_SEARCH: "YouTube Search",
  RELATED_VIDEO: "Suggested",
  EXT_URL: "External",
  YT_CHANNEL: "Channel pages",
  SUBSCRIBER: "Subscriptions",
  NO_LINK_OTHER: "Direct",
  YT_OTHER_PAGE: "Browse",
  PLAYLIST: "Playlists",
  NOTIFICATION: "Notifications",
  END_SCREEN: "End screens",
  SHORTS: "Shorts",
  ADVERTISING: "Advertising",
  HASHTAGS: "Hashtags",
  SOUND_PAGE: "Sound pages",
  VIDEO_REMIXES: "Remixes",
};

const AD_LABELS: Record<string, string> = {
  auctionTrueviewInstream: "Skippable video ads",
  auctionDisplay: "Display ads",
  auctionBumperInstream: "Bumper ads",
  auctionInstream: "Non-skippable ads",
  auctionOverlay: "Overlay ads",
  reservedBumperInstream: "Reserved bumper ads",
  reservedInstream: "Reserved in-stream ads",
};

export function rangeDayCount(range: string): number {
  if (range === "7d") return 7;
  if (range === "90d") return 90;
  if (range === "1y") return 365;
  return 28;
}

export function asAnalyticsRange(value: string | null | undefined): AnalyticsRangeKey {
  if (value === "7d" || value === "90d" || value === "1y" || value === "28d") return value;
  return "28d";
}

type TokenChannel = {
  id: string;
  channelId: string;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  tokenExpiresAt: Date;
};

export async function loadChannelAnalytics(
  user: SessionUser,
  channelDbId: string,
  range: AnalyticsRangeKey,
  options: { refresh?: boolean } = {},
): Promise<AnalyticsBundle> {
  await requireChannelAccess(user, channelDbId);
  const channel = await prisma.youtubeChannel.findUniqueOrThrow({
    where: { id: channelDbId },
    select: {
      id: true,
      channelId: true,
      accessTokenEnc: true,
      refreshTokenEnc: true,
      tokenExpiresAt: true,
    },
  });
  const auth = await getAuthedClientForChannel(channel);
  return runWithYoutubeUsage({ userId: user.id, channelId: channelDbId }, async () => {
    try {
      return await loadAnalyticsBundle(channel, auth, range, options);
    } catch (error) {
      const message = explainAnalyticsError(error);
      const bundle = emptyBundle(range, message);
      return bundle;
    }
  });
}

export async function loadAnalyticsBundle(
  channel: TokenChannel,
  auth: OAuth2Client,
  range: AnalyticsRangeKey,
  options: { refresh?: boolean } = {},
): Promise<AnalyticsBundle> {
  const existing = await prisma.youtubeAnalyticsSnapshot.findUnique({
    where: {
      channelId_reportKey_rangeKey: {
        channelId: channel.id,
        reportKey: REPORT_KEY,
        rangeKey: range,
      },
    },
  });
  const age = existing ? Date.now() - existing.fetchedAt.getTime() : Number.POSITIVE_INFINITY;
  const cachedError =
    existing?.errorMessage ??
    (existing?.payload && typeof existing.payload === "object" && "error" in existing.payload
      ? String((existing.payload as { error?: unknown }).error ?? "")
      : null);
  const freshFor = cachedError ? ERROR_FRESH_MS : FRESH_MS;
  // "API disabled" is temporary: Google needs a few minutes after Enable, so do not keep that failure.
  const cached = existing?.payload as AnalyticsBundle | undefined;
  if (
    existing &&
    cached &&
    cached.lifetimeWatchMinutes != null &&
    !options.refresh &&
    age < freshFor &&
    !isEnablementError(cachedError)
  ) {
    return cached;
  }

  let bundle: AnalyticsBundle;
  try {
    bundle = await fetchBundle(auth, channel.channelId, range);
  } catch (error) {
    bundle = emptyBundle(range, explainAnalyticsError(error));
  }
  await prisma.youtubeAnalyticsSnapshot.upsert({
    where: {
      channelId_reportKey_rangeKey: {
        channelId: channel.id,
        reportKey: REPORT_KEY,
        rangeKey: range,
      },
    },
    create: {
      channelId: channel.id,
      reportKey: REPORT_KEY,
      rangeKey: range,
      payload: bundle,
      errorMessage: bundle.error,
    },
    update: {
      payload: bundle,
      errorMessage: bundle.error,
      fetchedAt: new Date(),
    },
  });
  return bundle;
}

async function fetchBundle(
  auth: OAuth2Client,
  youtubeChannelId: string,
  range: AnalyticsRangeKey,
): Promise<AnalyticsBundle> {
  const days = rangeDayCount(range);
  const end = utcToday();
  const start = addUtcDays(end, -(days * 2 - 1));
  const currentStart = addUtcDays(end, -(days - 1));
  const ids = `channel==${youtubeChannelId}`;
  const coreMetrics = [
    "views",
    "estimatedMinutesWatched",
    "averageViewDuration",
    "likes",
    "comments",
    "shares",
    "subscribersGained",
  ];

  const core = await query(auth, {
    ids,
    startDate: iso(start),
    endDate: iso(end),
    dimensions: "day",
    metrics: coreMetrics.join(","),
  });

  const revenue = await query(auth, {
    ids,
    startDate: iso(currentStart),
    endDate: iso(end),
    dimensions: "day",
    metrics: "estimatedRevenue",
  }).catch(() => null);

  const impressions = await query(auth, {
    ids,
    startDate: iso(currentStart),
    endDate: iso(end),
    dimensions: "day",
    metrics: "impressions,impressionClickThroughRate",
  }).catch(() => null);

  const lifetimeWatch = await query(auth, {
    ids,
    startDate: "2006-01-01",
    endDate: iso(end),
    metrics: "estimatedMinutesWatched",
  }).catch(() => null);

  const [countries, traffic, devices, ages, genders, adTypes, videos] = await Promise.all([
    query(auth, {
      ids,
      startDate: iso(currentStart),
      endDate: iso(end),
      dimensions: "country",
      metrics: "views",
      sort: "-views",
      maxResults: 8,
    }).catch(() => []),
    query(auth, {
      ids,
      startDate: iso(currentStart),
      endDate: iso(end),
      dimensions: "insightTrafficSourceType",
      metrics: "views",
      sort: "-views",
      maxResults: 8,
    }).catch(() => []),
    query(auth, {
      ids,
      startDate: iso(currentStart),
      endDate: iso(end),
      dimensions: "deviceType",
      metrics: "views",
      sort: "-views",
    }).catch(() => []),
    query(auth, {
      ids,
      startDate: iso(currentStart),
      endDate: iso(end),
      dimensions: "ageGroup",
      metrics: "viewerPercentage",
      sort: "ageGroup",
    }).catch(() => []),
    query(auth, {
      ids,
      startDate: iso(currentStart),
      endDate: iso(end),
      dimensions: "gender",
      metrics: "viewerPercentage",
    }).catch(() => []),
    query(auth, {
      ids,
      startDate: iso(currentStart),
      endDate: iso(end),
      dimensions: "adType",
      metrics: "grossRevenue",
      sort: "-grossRevenue",
    }).catch(() => []),
    query(auth, {
      ids,
      startDate: iso(currentStart),
      endDate: iso(end),
      dimensions: "video",
      metrics: revenue
        ? "views,estimatedMinutesWatched,estimatedRevenue"
        : "views,estimatedMinutesWatched",
      sort: "-views",
      maxResults: 15,
    }).catch(() => []),
  ]);

  const revenueByDay = new Map(revenue?.map((row) => [String(row[0]), num(row[1])]) ?? []);
  const impressionsByDay = new Map(
    impressions?.map((row) => [String(row[0]), { impressions: num(row[1]), ctr: num(row[2]) }]) ?? [],
  );
  const allDays = core.map((row) => {
    const date = String(row[0]);
    const extra = impressionsByDay.get(date);
    return {
      date,
      views: num(row[1]),
      watchMinutes: num(row[2]),
      averageViewDuration: num(row[3]),
      likes: num(row[4]),
      comments: num(row[5]),
      shares: num(row[6]),
      subscribersGained: num(row[7]),
      estimatedRevenue: revenue ? (revenueByDay.get(date) ?? 0) : null,
      impressions: impressions ? (extra?.impressions ?? 0) : null,
      ctr: impressions ? (extra?.ctr ?? 0) : null,
    } satisfies AnalyticsDay;
  });
  const currentDays = allDays.filter((day) => day.date >= iso(currentStart));
  const previousDays = allDays.filter((day) => day.date < iso(currentStart));

  return {
    range,
    startDate: iso(currentStart),
    endDate: iso(end),
    monetaryAvailable: revenue != null,
    impressionsAvailable: impressions != null,
    lifetimeWatchMinutes: lifetimeWatch?.[0] ? num(lifetimeWatch[0][0]) : null,
    days: currentDays,
    previousDays,
    countries: countries.map((row) => ({
      label: countryName(String(row[0])),
      code: String(row[0]),
      value: num(row[1]),
    })),
    traffic: traffic.map((row) => ({
      label: TRAFFIC_LABELS[String(row[0])] ?? titleCase(String(row[0])),
      value: num(row[1]),
    })),
    devices: devices.map((row) => ({ label: titleCase(String(row[0])), value: num(row[1]) })),
    ages: ages.map((row) => ({ label: ageLabel(String(row[0])), value: num(row[1]) })),
    genders: genders.map((row) => ({ label: titleCase(String(row[0])), value: num(row[1]) })),
    adTypes: adTypes.map((row) => ({
      label: AD_LABELS[String(row[0])] ?? titleCase(String(row[0])),
      value: num(row[1]),
    })),
    videos: videos.map((row) => ({
      videoId: String(row[0]),
      views: num(row[1]),
      watchMinutes: num(row[2]),
      estimatedRevenue: revenue ? num(row[3]) : null,
    })),
    error: null,
  };
}

async function query(
  auth: OAuth2Client,
  params: {
    ids: string;
    startDate: string;
    endDate: string;
    dimensions?: string;
    metrics: string;
    sort?: string;
    maxResults?: number;
  },
): Promise<Array<Array<string | number>>> {
  const analytics = google.youtubeAnalytics({ version: "v2", auth });
  const { data } = await trackYoutubeCall(
    { operation: "analytics.reports.query", method: "GET", units: 1 },
    () => analytics.reports.query(params),
  );
  return (data.rows ?? []) as Array<Array<string | number>>;
}

function num(value: string | number | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function utcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ageLabel(value: string): string {
  return value.replace(/^age/i, "").replace("-", "–");
}

function isEnablementError(message: string | null | undefined): boolean {
  if (!message) return false;
  return /has not been used|it is disabled|propagate to our systems/i.test(message);
}

function explainAnalyticsError(error: unknown): string {
  const message = error instanceof Error ? error.message : "YouTube Analytics request failed.";
  const enableUrl = message.match(
    /https:\/\/console\.developers\.google\.com\/apis\/api\/youtubeanalytics\.googleapis\.com\/overview\?project=\d+/,
  )?.[0];
  if (enableUrl || /youtubeanalytics\.googleapis\.com/i.test(message)) {
    return `Turn on the YouTube Analytics API in Google Cloud, wait a few minutes, then refresh. ${enableUrl ?? "https://console.cloud.google.com/apis/library/youtubeanalytics.googleapis.com"}`;
  }
  return message.slice(0, 300);
}

function emptyBundle(range: AnalyticsRangeKey, error: string): AnalyticsBundle {
  const end = utcToday();
  const start = addUtcDays(end, -(rangeDayCount(range) - 1));
  return {
    range,
    startDate: iso(start),
    endDate: iso(end),
    monetaryAvailable: false,
    impressionsAvailable: false,
    lifetimeWatchMinutes: null,
    days: [],
    previousDays: [],
    countries: [],
    traffic: [],
    devices: [],
    ages: [],
    genders: [],
    adTypes: [],
    videos: [],
    error,
  };
}

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
