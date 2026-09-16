import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/auth/session";
import { normalizeEmail } from "@/lib/auth/password";
import { prisma } from "@/lib/db";

function shareIdentityWhere(user: SessionUser): Prisma.ChannelShareWhereInput {
  const email = normalizeEmail(user.email ?? "");
  return {
    OR: [
      { userId: user.id },
      ...(email ? [{ email }] : []),
    ],
  };
}

/** Match channels the user owns or that have been shared with their account/email. */
export function channelAccessWhere(user: SessionUser): Prisma.YoutubeChannelWhereInput {
  return {
    OR: [
      { userId: user.id },
      { shares: { some: shareIdentityWhere(user) } },
    ],
  };
}

export async function getChannelAccess(user: SessionUser, channelDbId: string) {
  const channel = await prisma.youtubeChannel.findFirst({
    where: { id: channelDbId, ...channelAccessWhere(user) },
    select: { id: true, userId: true },
  });
  if (!channel) return null;
  return { isOwner: channel.userId === user.id };
}

/** Require ownership or a share grant without revealing inaccessible channel ids. */
export async function requireChannelAccess(user: SessionUser, channelDbId: string) {
  const access = await getChannelAccess(user, channelDbId);
  if (!access) throw new Error("CHANNEL_NOT_FOUND");
  return access;
}

/** Require ownership for connection-wide operations and access management. */
export async function requireChannelOwner(user: SessionUser, channelDbId: string) {
  const channel = await prisma.youtubeChannel.findFirst({
    where: { id: channelDbId, userId: user.id },
    select: { id: true },
  });
  if (!channel) throw new Error("CHANNEL_NOT_FOUND");
}
