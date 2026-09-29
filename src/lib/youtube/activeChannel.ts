import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { listChannels, type ConnectedChannel } from "@/lib/youtube/repo";

export type ActiveChannelBadge = {
  title: string;
  thumbnailUrl: string | null;
};

/**
 * The channel new videos are created for.
 * A saved id the user can no longer access is cleared so they can choose again.
 * When they have never chosen and at least one channel is connected, the first
 * channel is saved.
 */
export async function resolveActiveChannelId(
  user: SessionUser,
  channels: ConnectedChannel[],
): Promise<string | null> {
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { activeChannelId: true },
  });
  const stored = row?.activeChannelId ?? null;
  if (stored && channels.some((channel) => channel.id === stored)) return stored;

  if (stored) {
    await prisma.user.update({
      where: { id: user.id },
      data: { activeChannelId: null },
    });
    return null;
  }

  const first = channels[0];
  if (!first) return null;

  await prisma.user.update({
    where: { id: user.id },
    data: { activeChannelId: first.id },
  });
  return first.id;
}

export async function getActiveChannelBadge(
  user: SessionUser,
): Promise<ActiveChannelBadge | null> {
  const channels = await listChannels(user);
  const activeChannelId = await resolveActiveChannelId(user, channels);
  const channel = channels.find((item) => item.id === activeChannelId);
  if (!channel) return null;
  return { title: channel.title, thumbnailUrl: channel.thumbnailUrl };
}
