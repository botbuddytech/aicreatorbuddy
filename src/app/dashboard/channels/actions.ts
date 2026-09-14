"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireDemoAuth } from "@/lib/demoAuth.server";
import { revokeToken } from "@/lib/youtube/oauth";
import { getChannelVideos, type VideoPage } from "@/lib/youtube/repo";
import { syncChannel } from "@/lib/youtube/sync";

type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function toError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  if (message === "UNAUTHORIZED") return "Please log in again.";
  return message ? message.slice(0, 300) : fallback;
}

export async function syncChannelAction(channelDbId: string): Promise<ActionResult> {
  try {
    await requireDemoAuth();
    const count = await syncChannel(channelDbId);
    revalidatePath("/dashboard/channels");
    return { ok: true, message: `Synced ${count} video${count === 1 ? "" : "s"}.` };
  } catch (error) {
    return { ok: false, error: toError(error, "Sync failed.") };
  }
}

export async function disconnectChannelAction(channelDbId: string): Promise<ActionResult> {
  try {
    await requireDemoAuth();
    const channel = await prisma.youtubeChannel.findUnique({
      where: { id: channelDbId },
      select: { refreshTokenEnc: true },
    });
    if (!channel) return { ok: false, error: "Channel not found." };

    await revokeToken(channel.refreshTokenEnc);
    await prisma.youtubeChannel.delete({ where: { id: channelDbId } });
    revalidatePath("/dashboard/channels");
    return { ok: true, message: "Channel disconnected." };
  } catch (error) {
    return { ok: false, error: toError(error, "Disconnect failed.") };
  }
}

export async function loadChannelVideosAction(
  channelDbId: string,
  cursor: string | null,
): Promise<VideoPage> {
  await requireDemoAuth();
  return getChannelVideos(channelDbId, { cursor, limit: 24 });
}
