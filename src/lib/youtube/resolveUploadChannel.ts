import type { SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { pickUploadChannelId } from "@/lib/scheduler/pickUploadChannel";
import { channelAccessWhere } from "@/lib/youtube/access";

/** The connected channel an upload should land on, given an optional requested id. */
export async function resolveUploadChannel(user: SessionUser, requestedId: string) {
  const accessible = await prisma.youtubeChannel.findMany({
    where: { ...channelAccessWhere(user) },
    select: { id: true, status: true },
    orderBy: { createdAt: "asc" },
  });
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { activeChannelId: true },
  });
  const id = pickUploadChannelId({
    selectedChannelId: requestedId,
    activeChannelId: me?.activeChannelId,
    channels: accessible,
  });
  if (!id) throw new Error("Connect a YouTube channel before uploading.");
  return prisma.youtubeChannel.findUniqueOrThrow({ where: { id } });
}
