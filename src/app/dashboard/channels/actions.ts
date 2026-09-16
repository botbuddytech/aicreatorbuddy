"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { normalizeEmail } from "@/lib/auth/password";
import { requireUser } from "@/lib/auth/session";
import { revokeToken } from "@/lib/youtube/oauth";
import { getChannelVideos, type VideoPage } from "@/lib/youtube/repo";
import { syncChannel } from "@/lib/youtube/sync";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export type ChannelShareItem = {
  id: string;
  email: string;
  status: "pending" | "active";
  createdAt: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  if (message === "UNAUTHORIZED") return "Please log in again.";
  if (message === "CHANNEL_NOT_FOUND") return "Channel not found.";
  return message ? message.slice(0, 300) : fallback;
}

function revalidateChannelViews() {
  revalidatePath("/dashboard/channels");
  revalidatePath("/dashboard/create");
}

export async function syncChannelAction(channelDbId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const count = await syncChannel({ channelDbId, user });
    revalidatePath("/dashboard/channels");
    return { ok: true, message: `Synced ${count} video${count === 1 ? "" : "s"}.` };
  } catch (error) {
    return { ok: false, error: toError(error, "Sync failed.") };
  }
}

export async function disconnectChannelAction(channelDbId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const channel = await prisma.youtubeChannel.findFirst({
      where: { id: channelDbId, userId: user.id },
      select: { refreshTokenEnc: true },
    });
    if (!channel) return { ok: false, error: "Channel not found." };

    await revokeToken(channel.refreshTokenEnc);
    await prisma.youtubeChannel.delete({ where: { id: channelDbId } });
    revalidateChannelViews();
    return { ok: true, message: "Channel disconnected." };
  } catch (error) {
    return { ok: false, error: toError(error, "Disconnect failed.") };
  }
}

export async function loadChannelVideosAction(
  channelDbId: string,
  cursor: string | null,
): Promise<VideoPage> {
  const user = await requireUser();
  return getChannelVideos(user, channelDbId, { cursor, limit: 24 });
}

export async function listChannelSharesAction(channelDbId: string): Promise<ChannelShareItem[]> {
  const user = await requireUser();
  const owned = await prisma.youtubeChannel.findFirst({
    where: { id: channelDbId, userId: user.id },
    select: { id: true },
  });
  if (!owned) throw new Error("Channel not found.");

  const shares = await prisma.channelShare.findMany({
    where: { channelId: channelDbId },
    select: { id: true, email: true, acceptedAt: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return shares.map((share) => ({
    id: share.id,
    email: share.email,
    status: share.acceptedAt ? "active" : "pending",
    createdAt: share.createdAt.toISOString(),
  }));
}

export async function shareChannelAction(
  channelDbId: string,
  emailInput: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const email = normalizeEmail(emailInput);
    if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
    if (email === normalizeEmail(user.email ?? "")) {
      return { ok: false, error: "You already own this channel." };
    }

    const channel = await prisma.youtubeChannel.findFirst({
      where: { id: channelDbId, userId: user.id },
      select: { id: true },
    });
    if (!channel) return { ok: false, error: "Channel not found." };

    const existing = await prisma.channelShare.findUnique({
      where: { channelId_email: { channelId: channelDbId, email } },
      select: { id: true },
    });
    if (existing) return { ok: false, error: "This person already has access." };

    const invitedUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    await prisma.channelShare.create({
      data: {
        channelId: channelDbId,
        email,
        invitedById: user.id,
        ...(invitedUser
          ? { userId: invitedUser.id, acceptedAt: new Date() }
          : {}),
      },
    });
    revalidateChannelViews();
    return {
      ok: true,
      message: invitedUser
        ? `Access granted to ${email}.`
        : `Invite saved for ${email}. Access starts when they create an account.`,
    };
  } catch (error) {
    return { ok: false, error: toError(error, "Could not grant access.") };
  }
}

export async function revokeShareAction(shareId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const share = await prisma.channelShare.findFirst({
      where: { id: shareId, channel: { userId: user.id } },
      select: { id: true, email: true },
    });
    if (!share) return { ok: false, error: "Access grant not found." };

    await prisma.channelShare.delete({ where: { id: share.id } });
    revalidateChannelViews();
    return { ok: true, message: `Access revoked for ${share.email}.` };
  } catch (error) {
    return { ok: false, error: toError(error, "Could not revoke access.") };
  }
}

export async function leaveChannelAction(channelDbId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const email = normalizeEmail(user.email ?? "");
    const deleted = await prisma.channelShare.deleteMany({
      where: {
        channelId: channelDbId,
        OR: [
          { userId: user.id },
          ...(email ? [{ email }] : []),
        ],
      },
    });
    if (!deleted.count) return { ok: false, error: "Channel not found." };

    revalidateChannelViews();
    return { ok: true, message: "You left the shared channel." };
  } catch (error) {
    return { ok: false, error: toError(error, "Could not leave channel.") };
  }
}
