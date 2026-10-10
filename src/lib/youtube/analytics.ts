import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { requireChannelAccess } from "@/lib/youtube/access";
import { getAuthedClientForChannel } from "@/lib/youtube/oauth";
import { runWithYoutubeUsage, trackYoutubeCall } from "@/lib/youtube/usage";

import { addUtcDays, monthQueryBounds, rangeWindow } from "@/lib/youtube/analyticsRange";
import type { AnalyticsRangeKey } from "@/lib/youtube/analyticsRange";

export type { AnalyticsRangeKey } from "@/lib/youtube/analyticsRange";
export { LIFETIME_START, asAnalyticsRange, rangeDayCount, rangeWindow, reportingEnd } from "@/lib/youtube/analyticsRange";

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

export type AnalyticsTotals = {
  views: number;
  watchMinutes: number;
  likes: number;
  comments: number;
  shares: number;
  subscribersGained: number;
  estimatedRevenue: number | null;
  impressions: number | null;
  ctr: number | null;
};

export type AnalyticsBundle = {
  range: AnalyticsRangeKey;
  startDate: string;
  endDate: string;
  monetaryAvailable: boolean;
  impressionsAvailable: boolean;
  /** Selected-range minutes from one Analytics total. Null when that query did not return. */
  periodWatchMinutes: number | null;
  /** The previous window of the same length. Null when that query did not return. */
  previousWatchMinutes: number | null;
  totals: AnalyticsTotals | null;
  previousTotals: AnalyticsTotals | null;
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

const REPORT_KEY = "bundle-v4";
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
  CAMPAIGN_CARD: "Campaign cards",
  NO_LINK_EMBEDDED: "Embedded",
  PRODUCT_PAGE: "Product pages",
  PROMOTED: "Promoted",
  LIVE_REDIRECT: "Live redirect",
  IMMERSIVE_LIVE: "Live",
  YT_PLAYLIST_PAGE: "Playlists",
  SHORTS_CONTENT_LINKS: "Shorts links",
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
    cached.totals != null &&
    cached.periodWatchMinutes != null &&
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

const CORE_METRICS = "views,estimatedMinutesWatched,likes,comments,shares,subscribersGained";

async function fetchBundle(
  auth: OAuth2Client,
  youtubeChannelId: string,
  range: AnalyticsRangeKey,
): Promise<AnalyticsBundle> {
  const bounds = rangeWindow(range);
  const startDate = iso(bounds.start);
  const endDate = iso(bounds.end);
  const ids = `channel==${youtubeChannelId}`;
  const [totals, previousTotals] = await Promise.all([
    fetchTotals(auth, ids, startDate, endDate),
    bounds.previousStart && bounds.previousEnd
      ? fetchTotals(auth, ids, iso(bounds.previousStart), iso(bounds.previousEnd))
      : Promise.resolve(null),
  ]);
  if (!totals) {
    throw new Error("YouTube Analytics did not return totals for this range.");
  }

  const monetaryAvailable = totals.estimatedRevenue != null;
  const seriesStart = bounds.grain === "day" && bounds.previousStart ? bounds.previousStart : bounds.start;
  const monthBounds = bounds.grain === "month" ? monthQueryBounds(seriesStart, bounds.end) : null;
  const seriesQueryStart = monthBounds ? monthBounds.start : seriesStart;
  const seriesQueryEnd = monthBounds ? monthBounds.end : bounds.end;
  const seriesStartDate = iso(seriesQueryStart);
  const seriesEndDate = iso(seriesQueryEnd);
  const queryMonth = bounds.grain === "day" || seriesQueryStart.getTime() <= seriesQueryEnd.getTime();

  const [coreSeries, revenueSeries, impressionSeries, partialSeries, partialRevenue, countries, traffic, devices, ages, genders, adTypes, videos] =
    await Promise.all([
      queryMonth ? fetchSeries(auth, ids, seriesStartDate, seriesEndDate, bounds.grain) : Promise.resolve(emptyReport()),
      queryMonth
        ? query(auth, {
            ids,
            startDate: seriesStartDate,
            endDate: seriesEndDate,
            dimensions: bounds.grain,
            metrics: "estimatedRevenue",
            sort: bounds.grain,
          }).catch(() => null)
        : Promise.resolve(null),
      queryMonth
        ? query(auth, {
            ids,
            startDate: seriesStartDate,
            endDate: seriesEndDate,
            dimensions: bounds.grain,
            metrics: "impressions,impressionClickThroughRate",
            sort: bounds.grain,
          }).catch(() => null)
        : Promise.resolve(null),
      monthBounds?.partialStart && monthBounds.partialEnd
        ? fetchSeries(auth, ids, iso(monthBounds.partialStart), iso(monthBounds.partialEnd), "day")
        : Promise.resolve(null),
      monthBounds?.partialStart && monthBounds.partialEnd && monetaryAvailable
        ? query(auth, {
            ids,
            startDate: iso(monthBounds.partialStart),
            endDate: iso(monthBounds.partialEnd),
            dimensions: "day",
            metrics: "estimatedRevenue",
            sort: "day",
          }).catch(() => null)
        : Promise.resolve(null),
      rankedBreakdown(auth, ids, startDate, endDate, "country", "views", 25),
      rankedBreakdown(auth, ids, startDate, endDate, "insightTrafficSourceType", "views", 25),
      rankedBreakdown(auth, ids, startDate, endDate, "deviceType", "views", 10),
      query(auth, {
        ids,
        startDate,
        endDate,
        // Channel demographics report: ageGroup only supports viewerPercentage.
        // https://developers.google.com/youtube/analytics/channel_reports
        dimensions: "ageGroup",
        metrics: "viewerPercentage",
        sort: "ageGroup",
      }).catch((error) => {
        console.error("[youtube-analytics] ageGroup failed", explainAnalyticsError(error));
        return emptyReport();
      }),
      query(auth, {
        ids,
        startDate,
        endDate,
        dimensions: "gender",
        metrics: "viewerPercentage",
      }).catch(() => emptyReport()),
      rankedBreakdown(auth, ids, startDate, endDate, "adType", "grossRevenue", 10),
      rankedBreakdown(
        auth,
        ids,
        startDate,
        endDate,
        "video",
        monetaryAvailable ? "views,estimatedMinutesWatched,estimatedRevenue" : "views,estimatedMinutesWatched",
        15,
      ),
    ]);

  const revenueByDate = indexMetric(revenueSeries, "estimatedRevenue");
  const impressionsByDate = impressionSeries
    ? new Map(
        impressionSeries.rows.map((row) => [
          String(row[0]),
          {
            impressions: metricAt(impressionSeries.headers, row, "impressions"),
            ctr: metricAt(impressionSeries.headers, row, "impressionClickThroughRate"),
          },
        ]),
      )
    : null;
  const parsedDays = coreSeries.rows.map((row) => {
    const rawDate = String(row[0]);
    const date = pointDate(rawDate, bounds.grain);
    const extra = impressionsByDate?.get(rawDate) ?? impressionsByDate?.get(date);
    return {
      date,
      views: metricAt(coreSeries.headers, row, "views"),
      watchMinutes: metricAt(coreSeries.headers, row, "estimatedMinutesWatched"),
      averageViewDuration: 0,
      likes: metricAt(coreSeries.headers, row, "likes"),
      comments: metricAt(coreSeries.headers, row, "comments"),
      shares: metricAt(coreSeries.headers, row, "shares"),
      subscribersGained: metricAt(coreSeries.headers, row, "subscribersGained"),
      estimatedRevenue: revenueSeries ? (revenueByDate.get(rawDate) ?? revenueByDate.get(date) ?? 0) : null,
      impressions: impressionSeries ? (extra?.impressions ?? 0) : null,
      ctr: impressionSeries ? (extra?.ctr ?? 0) : null,
    } satisfies AnalyticsDay;
  });
  const partialMonth =
    partialSeries && monthBounds?.partialStart
      ? collapseMonth(partialSeries, iso(monthBounds.partialStart).slice(0, 7), partialRevenue)
      : null;
  const filled =
    bounds.grain === "day"
      ? fillDays(seriesStart, bounds.end, parsedDays, revenueSeries != null, impressionSeries != null)
      : parsedDays;
  const withPartial = partialMonth ? [...filled, partialMonth] : filled;
  const currentDays = withPartial
    .filter((day) => (bounds.grain === "month" ? day.date.slice(0, 7) >= startDate.slice(0, 7) : day.date >= startDate))
    .sort((a, b) => a.date.localeCompare(b.date));
  const previousDays = withPartial
    .filter((day) => (bounds.grain === "month" ? day.date.slice(0, 7) < startDate.slice(0, 7) : day.date < startDate))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    range,
    startDate,
    endDate,
    monetaryAvailable,
    impressionsAvailable: totals.impressions != null,
    periodWatchMinutes: totals.watchMinutes,
    previousWatchMinutes: previousTotals?.watchMinutes ?? null,
    totals,
    previousTotals,
    days: currentDays,
    previousDays,
    countries: topShares(countries, (code) => ({ label: countryName(code), code })),
    traffic: topShares(traffic, (code) => ({ label: TRAFFIC_LABELS[code] ?? titleCase(code) })),
    devices: shareRows(devices, (code) => titleCase(code)),
    ages: shareRows(ages, ageLabel),
    genders: shareRows(genders, titleCase),
    adTypes: shareRows(adTypes, (code) => AD_LABELS[code] ?? titleCase(code)),
    videos: videos.rows
      .map((row) => ({
        videoId: String(row[0]),
        views: metricAt(videos.headers, row, "views"),
        watchMinutes: metricAt(videos.headers, row, "estimatedMinutesWatched"),
        estimatedRevenue: monetaryAvailable ? metricAt(videos.headers, row, "estimatedRevenue") : null,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 15),
    error: null,
  };
}

type Report = {
  headers: string[];
  rows: Array<Array<string | number>>;
};

function emptyReport(): Report {
  return { headers: [], rows: [] };
}

function pointDate(value: string, grain: "day" | "month"): string {
  return grain === "month" ? value.slice(0, 7) : value.slice(0, 10);
}

function collapseMonth(report: Report, monthKey: string, revenueReport: Report | null): AnalyticsDay | null {
  if (!report.rows.length) return null;
  let revenueTotal = 0;
  let hasRevenue = false;
  const day: AnalyticsDay = {
    date: monthKey,
    views: 0,
    watchMinutes: 0,
    averageViewDuration: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    subscribersGained: 0,
    estimatedRevenue: null,
    impressions: null,
    ctr: null,
  };
  for (const row of report.rows) {
    day.views += metricAt(report.headers, row, "views");
    day.watchMinutes += metricAt(report.headers, row, "estimatedMinutesWatched");
    day.likes += metricAt(report.headers, row, "likes");
    day.comments += metricAt(report.headers, row, "comments");
    day.shares += metricAt(report.headers, row, "shares");
    day.subscribersGained += metricAt(report.headers, row, "subscribersGained");
  }
  if (revenueReport) {
    hasRevenue = true;
    for (const row of revenueReport.rows) {
      revenueTotal += metricAt(revenueReport.headers, row, "estimatedRevenue");
    }
  }
  day.estimatedRevenue = hasRevenue ? revenueTotal : null;
  return day;
}

async function fetchSeries(
  auth: OAuth2Client,
  ids: string,
  startDate: string,
  endDate: string,
  grain: "day" | "month",
): Promise<Report> {
  const metricSets = [CORE_METRICS, "views,estimatedMinutesWatched"];
  for (const metrics of metricSets) {
    try {
      return await query(auth, {
        ids,
        startDate,
        endDate,
        dimensions: grain,
        metrics,
        sort: grain,
        maxResults: 500,
      });
    } catch (error) {
      console.error("[youtube-analytics] series failed", explainAnalyticsError(error));
      try {
        return await query(auth, { ids, startDate, endDate, dimensions: grain, metrics, sort: grain });
      } catch (retryError) {
        console.error("[youtube-analytics] series retry failed", explainAnalyticsError(retryError));
      }
    }
  }
  return emptyReport();
}

async function fetchTotals(
  auth: OAuth2Client,
  ids: string,
  startDate: string,
  endDate: string,
): Promise<AnalyticsTotals | null> {
  const metricSets = [
    CORE_METRICS,
    "views,estimatedMinutesWatched,likes,comments,subscribersGained",
    "views,estimatedMinutesWatched",
  ];
  let core: Report | null = null;
  for (const metrics of metricSets) {
    try {
      core = await query(auth, { ids, startDate, endDate, metrics });
      break;
    } catch (error) {
      console.error("[youtube-analytics] totals failed", explainAnalyticsError(error));
    }
  }
  if (!core) return null;
  const row = core.rows[0] ?? [];
  const [revenue, impressions] = await Promise.all([
    query(auth, { ids, startDate, endDate, metrics: "estimatedRevenue" }).catch((error) => {
      console.error("[youtube-analytics] revenue failed", explainAnalyticsError(error));
      return null;
    }),
    query(auth, { ids, startDate, endDate, metrics: "impressions,impressionClickThroughRate" }).catch(() => null),
  ]);
  const revenueRow = revenue?.rows[0];
  const impressionRow = impressions?.rows[0];
  return {
    views: metricAt(core.headers, row, "views"),
    watchMinutes: metricAt(core.headers, row, "estimatedMinutesWatched"),
    likes: metricAt(core.headers, row, "likes"),
    comments: metricAt(core.headers, row, "comments"),
    shares: metricAt(core.headers, row, "shares"),
    subscribersGained: metricAt(core.headers, row, "subscribersGained"),
    estimatedRevenue: revenue && revenueRow ? metricAt(revenue.headers, revenueRow, "estimatedRevenue") : null,
    impressions: impressions && impressionRow ? metricAt(impressions.headers, impressionRow, "impressions") : null,
    ctr: impressions && impressionRow ? metricAt(impressions.headers, impressionRow, "impressionClickThroughRate") : null,
  };
}

async function rankedBreakdown(
  auth: OAuth2Client,
  ids: string,
  startDate: string,
  endDate: string,
  dimensions: string,
  metrics: string,
  maxResults: number,
): Promise<Report> {
  const primary = await tryRanked(auth, ids, startDate, endDate, dimensions, metrics, maxResults);
  if (primary) return primary;
  if (startDate < "2013-01-01") {
    const retry = await tryRanked(auth, ids, "2013-01-01", endDate, dimensions, metrics, maxResults);
    if (retry) return retry;
  }
  return emptyReport();
}

async function tryRanked(
  auth: OAuth2Client,
  ids: string,
  startDate: string,
  endDate: string,
  dimensions: string,
  metrics: string,
  maxResults: number,
): Promise<Report | null> {
  const sort = `-${metrics.split(",")[0]}`;
  try {
    return await query(auth, { ids, startDate, endDate, dimensions, metrics, sort, maxResults });
  } catch (error) {
    console.error(`[youtube-analytics] ${dimensions} failed`, explainAnalyticsError(error));
    try {
      return await query(auth, { ids, startDate, endDate, dimensions, metrics, maxResults });
    } catch (retryError) {
      console.error(`[youtube-analytics] ${dimensions} retry failed`, explainAnalyticsError(retryError));
      return null;
    }
  }
}

function indexMetric(report: Report | null, metric: string): Map<string, number> {
  if (!report) return new Map();
  return new Map(report.rows.map((row) => [String(row[0]), metricAt(report.headers, row, metric)]));
}

function topShares(
  report: Report,
  labelFor: (code: string) => { label: string; code?: string },
): AnalyticsShare[] {
  return report.rows
    .map((row) => {
      const code = String(row[0]);
      const named = labelFor(code);
      return { label: named.label, code: named.code ?? code, value: metricAt(report.headers, row, "views") || num(row[1]) };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function shareRows(report: Report, labelFor: (code: string) => string): AnalyticsShare[] {
  const metric = report.headers[1] ?? "views";
  return report.rows
    .map((row) => ({
      label: labelFor(String(row[0])),
      value: metricAt(report.headers, row, metric) || num(row[1]),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
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
): Promise<Report> {
  const analytics = google.youtubeAnalytics({ version: "v2", auth });
  const { data } = await trackYoutubeCall(
    { operation: "analytics.reports.query", method: "GET", units: 1 },
    () => analytics.reports.query(params),
  );
  return {
    headers: (data.columnHeaders ?? []).map((header) => header.name ?? ""),
    rows: (data.rows ?? []) as Array<Array<string | number>>,
  };
}

function metricAt(headers: string[], row: Array<string | number>, name: string): number {
  const index = headers.indexOf(name);
  if (index >= 0) return num(row[index]);
  return 0;
}

function num(value: string | number | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fillDays(
  start: Date,
  end: Date,
  days: AnalyticsDay[],
  monetary: boolean,
  impressions: boolean,
): AnalyticsDay[] {
  const byDate = new Map(days.map((day) => [day.date.slice(0, 10), day]));
  const filled: AnalyticsDay[] = [];
  for (let cursor = new Date(start); iso(cursor) <= iso(end); cursor = addUtcDays(cursor, 1)) {
    const date = iso(cursor);
    filled.push(
      byDate.get(date) ?? {
        date,
        views: 0,
        watchMinutes: 0,
        averageViewDuration: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        subscribersGained: 0,
        estimatedRevenue: monetary ? 0 : null,
        impressions: impressions ? 0 : null,
        ctr: impressions ? 0 : null,
      },
    );
  }
  return filled;
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
  const bounds = rangeWindow(range);
  return {
    range,
    startDate: iso(bounds.start),
    endDate: iso(bounds.end),
    monetaryAvailable: false,
    impressionsAvailable: false,
    periodWatchMinutes: null,
    previousWatchMinutes: null,
    totals: null,
    previousTotals: null,
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
