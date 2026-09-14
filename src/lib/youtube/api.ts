import { google, type youtube_v3 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

export type FetchedChannel = {
  channelId: string;
  title: string;
  customUrl: string | null;
  thumbnailUrl: string | null;
  subscriberCount: bigint;
  hiddenSubscriberCount: boolean;
  viewCount: bigint;
  videoCount: number;
  uploadsPlaylistId: string;
};

export type FetchedVideo = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  publishedAt: Date;
  durationSec: number | null;
  viewCount: bigint;
  likeCount: bigint;
  commentCount: bigint;
  privacyStatus: string;
  uploadStatus: string;
};

function yt(auth: OAuth2Client): youtube_v3.Youtube {
  return google.youtube({ version: "v3", auth });
}

function pickThumb(thumbs?: youtube_v3.Schema$ThumbnailDetails | null): string | null {
  return thumbs?.high?.url ?? thumbs?.medium?.url ?? thumbs?.default?.url ?? null;
}

function toBigInt(value?: string | null): bigint {
  try {
    return value ? BigInt(value) : BigInt(0);
  } catch {
    return BigInt(0);
  }
}

/** ISO 8601 duration (PT1H2M3S) to seconds. */
export function parseIsoDuration(value?: string | null): number | null {
  if (!value) return null;
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match) return null;
  const [, d, h, m, s] = match;
  return (
    Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0)
  );
}

/** The channel owned by the account/brand selected on the consent screen. */
export async function fetchMyChannel(auth: OAuth2Client): Promise<FetchedChannel> {
  const { data } = await yt(auth).channels.list({
    part: ["snippet", "statistics", "contentDetails"],
    mine: true,
    maxResults: 1,
  });
  const item = data.items?.[0];
  if (!item?.id) {
    throw new Error("This Google account has no YouTube channel. Create one on YouTube first.");
  }
  const uploads = item.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error("Channel has no uploads playlist");

  return {
    channelId: item.id,
    title: item.snippet?.title ?? "Untitled channel",
    customUrl: item.snippet?.customUrl ?? null,
    thumbnailUrl: pickThumb(item.snippet?.thumbnails),
    subscriberCount: toBigInt(item.statistics?.subscriberCount),
    hiddenSubscriberCount: item.statistics?.hiddenSubscriberCount === true,
    viewCount: toBigInt(item.statistics?.viewCount),
    // Per the docs this counts public videos only, even for the channel owner.
    videoCount: Number(item.statistics?.videoCount ?? 0),
    uploadsPlaylistId: uploads,
  };
}

/** Walk the uploads playlist (50/page) and hydrate stats via videos.list (50/batch). */
export async function fetchAllUploads(
  auth: OAuth2Client,
  uploadsPlaylistId: string,
): Promise<FetchedVideo[]> {
  const client = yt(auth);
  const ids: string[] = [];
  let pageToken: string | undefined;

  do {
    const { data } = await client.playlistItems.list({
      part: ["contentDetails"],
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      pageToken,
    });
    for (const item of data.items ?? []) {
      const id = item.contentDetails?.videoId;
      if (id) ids.push(id);
    }
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);

  const videos: FetchedVideo[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    // maxResults is not supported alongside the id filter, so it is omitted here.
    const { data } = await client.videos.list({
      part: ["snippet", "statistics", "contentDetails", "status"],
      id: batch,
    });
    for (const v of data.items ?? []) {
      if (!v.id) continue;
      videos.push({
        id: v.id,
        title: v.snippet?.title ?? "Untitled",
        description: v.snippet?.description ?? "",
        thumbnailUrl: pickThumb(v.snippet?.thumbnails),
        publishedAt: v.snippet?.publishedAt ? new Date(v.snippet.publishedAt) : new Date(0),
        durationSec: parseIsoDuration(v.contentDetails?.duration),
        viewCount: toBigInt(v.statistics?.viewCount),
        likeCount: toBigInt(v.statistics?.likeCount),
        commentCount: toBigInt(v.statistics?.commentCount),
        privacyStatus: v.status?.privacyStatus ?? "private",
        uploadStatus: v.status?.uploadStatus ?? "processed",
      });
    }
  }

  return videos;
}
