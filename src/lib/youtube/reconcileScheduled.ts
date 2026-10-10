import type { SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { channelAccessWhere } from "@/lib/youtube/access";
import { fetchVideosByIds } from "@/lib/youtube/api";
import { getAuthedClientForChannel } from "@/lib/youtube/oauth";

const CACHE_MS = 20_000;
const inflight = new Map<string, Promise<void>>();

/**
 * Drop local rows for videos that are no longer scheduled on YouTube.
 * Scheduled uploads are not in the uploads playlist, so a normal channel sync
 * never notices when they are deleted in YouTube Studio.
 */
export function reconcileScheduledVideos(user: SessionUser): Promise<void> {
  const existing = inflight.get(user.id);
  if (existing) return existing;
  const run = syncScheduledVideos(user).finally(() => {
    setTimeout(() => inflight.delete(user.id), CACHE_MS);
  });
  inflight.set(user.id, run);
  return run;
}

async function syncScheduledVideos(user: SessionUser): Promise<void> {
  const pending = await prisma.youtubeVideo.findMany({
    where: { publishAt: { gt: new Date() }, channel: { is: channelAccessWhere(user) } },
    select: { id: true, videoId: true, channelId: true },
  });
  if (pending.length === 0) return;

  const byChannel = new Map<string, typeof pending>();
  for (const row of pending) {
    const list = byChannel.get(row.channelId) ?? [];
    list.push(row);
    byChannel.set(row.channelId, list);
  }

  for (const [channelId, rows] of byChannel) {
    const channel = await prisma.youtubeChannel.findUnique({ where: { id: channelId } });
    if (!channel || channel.status !== "ACTIVE") continue;
    const auth = await getAuthedClientForChannel(channel);
    const live = await fetchVideosByIds(
      auth,
      rows.map((row) => row.videoId),
    );
    const liveById = new Map(live.map((video) => [video.id, video]));
    const gone: string[] = [];

    for (const row of rows) {
      const fresh = liveById.get(row.videoId);
      if (!fresh) {
        gone.push(row.videoId);
        continue;
      }
      await prisma.youtubeVideo.update({
        where: { id: row.id },
        data: {
          title: fresh.title,
          description: fresh.description,
          thumbnailUrl: fresh.thumbnailUrl,
          publishedAt: fresh.publishedAt,
          durationSec: fresh.durationSec,
          viewCount: fresh.viewCount,
          likeCount: fresh.likeCount,
          commentCount: fresh.commentCount,
          privacyStatus: fresh.privacyStatus,
          uploadStatus: fresh.uploadStatus,
          tags: fresh.tags,
          categoryId: fresh.categoryId,
          publishAt: fresh.publishAt,
          fetchedAt: new Date(),
        },
      });
    }

    if (gone.length === 0) continue;
    await prisma.youtubeVideo.deleteMany({
      where: { channelId, videoId: { in: gone } },
    });
    await prisma.videoSession.updateMany({
      where: { userId: user.id, youtubeVideoId: { in: gone } },
      data: { youtubeVideoId: null },
    });
  }
}
