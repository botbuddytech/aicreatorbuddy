import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { requireChannelAccess } from "@/lib/youtube/access";
import { fetchCommentThreads } from "@/lib/youtube/api";
import { getAuthedClientForChannel } from "@/lib/youtube/oauth";
import { runWithYoutubeUsage } from "@/lib/youtube/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ videoId: string }> },
) {
  try {
    const user = await requireUser();
    const { videoId } = await context.params;
    const channelId = new URL(request.url).searchParams.get("channelId") ?? "";
    if (!channelId) {
      return Response.json({ error: "Channel is required." }, { status: 400 });
    }
    await requireChannelAccess(user, channelId);
    const video = await prisma.youtubeVideo.findFirst({
      where: { channelId, videoId },
      select: { id: true },
    });
    if (!video) return Response.json({ error: "Video not found." }, { status: 404 });
    const channel = await prisma.youtubeChannel.findUniqueOrThrow({ where: { id: channelId } });
    const auth = await getAuthedClientForChannel(channel);
    const comments = await runWithYoutubeUsage({ userId: user.id, channelId }, () =>
      fetchCommentThreads(auth, videoId),
    );
    return Response.json({ comments }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load comments.";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return Response.json({ error: message.slice(0, 300) }, { status });
  }
}
