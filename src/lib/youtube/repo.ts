import { prisma } from "@/lib/db";
import type { ChannelConnectionStatus } from "@/generated/prisma/enums";
import type { SessionUser } from "@/lib/auth/session";
import { channelAccessWhere } from "@/lib/youtube/access";

/** Token-free, JSON-serializable channel shape for the UI. */
export type ConnectedChannel = {
  id: string;
  channelId: string;
  title: string;
  customUrl: string | null;
  thumbnailUrl: string | null;
  subscriberCount: number;
  hiddenSubscriberCount: boolean;
  viewCount: number;
  videoCount: number;
  syncedVideoCount: number;
  googleEmail: string | null;
  status: ChannelConnectionStatus;
  lastSyncedAt: string | null;
  createdAt: string;
  isOwner: boolean;
  ownerEmail: string | null;
  shareCount: number;
};

export type ChannelVideo = {
  id: string;
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  publishedAt: string;
  durationSec: number | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  privacyStatus: string;
  uploadStatus: string;
};

export type VideoPage = {
  items: ChannelVideo[];
  nextCursor: string | null;
};

const channelSelect = {
  id: true,
  userId: true,
  channelId: true,
  title: true,
  customUrl: true,
  thumbnailUrl: true,
  subscriberCount: true,
  hiddenSubscriberCount: true,
  viewCount: true,
  videoCount: true,
  googleEmail: true,
  status: true,
  lastSyncedAt: true,
  createdAt: true,
  user: { select: { email: true } },
} as const;

type ChannelRow = {
  id: string;
  userId: string;
  channelId: string;
  title: string;
  customUrl: string | null;
  thumbnailUrl: string | null;
  subscriberCount: bigint;
  hiddenSubscriberCount: boolean;
  viewCount: bigint;
  videoCount: number;
  googleEmail: string | null;
  status: ChannelConnectionStatus;
  lastSyncedAt: Date | null;
  createdAt: Date;
  user: { email: string };
  _count: { videos: number; shares: number };
};

function toChannel(row: ChannelRow, viewerId: string): ConnectedChannel {
  const { _count, user, userId, ...rest } = row;
  return {
    ...rest,
    subscriberCount: Number(row.subscriberCount),
    viewCount: Number(row.viewCount),
    syncedVideoCount: _count.videos,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    isOwner: userId === viewerId,
    ownerEmail: user.email,
    shareCount: _count.shares,
  };
}

const withVideoCount = {
  ...channelSelect,
  _count: { select: { videos: true, shares: true } },
} as const;

export async function listChannels(user: SessionUser): Promise<ConnectedChannel[]> {
  const rows = await prisma.youtubeChannel.findMany({
    where: channelAccessWhere(user),
    select: withVideoCount,
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => toChannel(row, user.id));
}

export async function getChannel(user: SessionUser, id: string): Promise<ConnectedChannel | null> {
  const row = await prisma.youtubeChannel.findFirst({
    where: { id, ...channelAccessWhere(user) },
    select: withVideoCount,
  });
  return row ? toChannel(row, user.id) : null;
}

export async function getChannelVideos(
  user: SessionUser,
  channelDbId: string,
  opts: { cursor?: string | null; limit?: number } = {},
): Promise<VideoPage> {
  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 50);
  const rows = await prisma.youtubeVideo.findMany({
    where: {
      channelId: channelDbId,
      channel: { is: channelAccessWhere(user) },
    },
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    take: limit + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map((v) => ({
    id: v.id,
    videoId: v.videoId,
    title: v.title,
    thumbnailUrl: v.thumbnailUrl,
    publishedAt: v.publishedAt.toISOString(),
    durationSec: v.durationSec,
    viewCount: Number(v.viewCount),
    likeCount: Number(v.likeCount),
    commentCount: Number(v.commentCount),
    privacyStatus: v.privacyStatus,
    uploadStatus: v.uploadStatus,
  }));

  return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
}
