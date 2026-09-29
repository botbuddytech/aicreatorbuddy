"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { requireChannelAccess } from "@/lib/youtube/access";

export type ActiveChannelResult = { ok: true } | { ok: false; error: string };

export async function setActiveChannelAction(channelId: string): Promise<ActiveChannelResult> {
  try {
    const user = await requireUser();
    await requireChannelAccess(user, channelId);
    await prisma.user.update({
      where: { id: user.id },
      data: { activeChannelId: channelId },
    });
    revalidatePath("/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHORIZED") return { ok: false, error: "Please log in again." };
    if (message === "CHANNEL_NOT_FOUND") return { ok: false, error: "Channel not found." };
    return { ok: false, error: "Could not save the selected channel." };
  }
}
