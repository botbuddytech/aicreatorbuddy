import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { requireChannelAccess } from "@/lib/youtube/access";
import { fetchAllUploads, fetchMyChannel } from "@/lib/youtube/api";
import { getAuthedClientForChannel } from "@/lib/youtube/oauth";

const UPSERT_CHUNK = 20;

/** Refresh channel stats and upsert every upload. Returns the number of videos synced. */
export async function syncChannel({
  channelDbId,
  user,
}: {
  channelDbId: string;
  user: SessionUser;
}): Promise<number> {
  await requireChannelAccess(user, channelDbId);
  const channel = await prisma.youtubeChannel.findUniqueOrThrow({ where: { id: channelDbId } });
  const auth = await getAuthedClientForChannel(channel);

  const fresh = await fetchMyChannel(auth);
  const videos = await fetchAllUploads(auth, fresh.uploadsPlaylistId);
  const now = new Date();

  // Chunked so a channel with hundreds of uploads cannot exceed the transaction timeout.
  for (let i = 0; i < videos.length; i += UPSERT_CHUNK) {
    const chunk = videos.slice(i, i + UPSERT_CHUNK);
    await prisma.$transaction(
      chunk.map(({ id: videoId, ...video }) =>
        prisma.youtubeVideo.upsert({
          where: { channelId_videoId: { channelId: channelDbId, videoId } },
          create: { ...video, videoId, channelId: channelDbId, fetchedAt: now },
          update: { ...video, fetchedAt: now },
        }),
      ),
    );
  }

  await prisma.$transaction([
    prisma.youtubeChannel.update({
      where: { id: channelDbId },
      data: {
        title: fresh.title,
        customUrl: fresh.customUrl,
        thumbnailUrl: fresh.thumbnailUrl,
        subscriberCount: fresh.subscriberCount,
        hiddenSubscriberCount: fresh.hiddenSubscriberCount,
        viewCount: fresh.viewCount,
        videoCount: fresh.videoCount,
        uploadsPlaylistId: fresh.uploadsPlaylistId,
        status: "ACTIVE",
        lastSyncedAt: now,
      },
    }),
    // Anything not touched by this run is no longer on the channel.
    prisma.youtubeVideo.deleteMany({
      where: { channelId: channelDbId, fetchedAt: { lt: now } },
    }),
  ]);

  return videos.length;
}
