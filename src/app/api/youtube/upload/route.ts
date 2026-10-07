import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { requireChannelAccess } from "@/lib/youtube/access";
import { getAuthedClientForChannel } from "@/lib/youtube/oauth";
import { createResumableUpload, type UploadPrivacy } from "@/lib/youtube/upload";
import { runWithYoutubeUsage } from "@/lib/youtube/usage";

export const runtime = "nodejs";

const NO_STORE = { "cache-control": "no-store" };

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin requests are not allowed." }, 403);
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      sessionId?: unknown;
      channelId?: unknown;
      title?: unknown;
      description?: unknown;
      tags?: unknown;
      privacy?: unknown;
      publishAt?: unknown;
      contentLength?: unknown;
      contentType?: unknown;
    };
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const channelId = typeof body.channelId === "string" ? body.channelId : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description : "";
    const tags = Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string") : [];
    const privacy: UploadPrivacy =
      body.privacy === "public" || body.privacy === "unlisted" || body.privacy === "private"
        ? body.privacy
        : "private";
    const publishAt = typeof body.publishAt === "string" && body.publishAt ? body.publishAt : null;
    const contentLength = typeof body.contentLength === "number" ? body.contentLength : 0;
    const contentType = typeof body.contentType === "string" ? body.contentType : "video/mp4";
    if (!sessionId || !channelId || !title || contentLength < 1) {
      return json({ error: "Title, channel, and video file are required." }, 400);
    }
    const session = await prisma.videoSession.findFirst({
      where: { id: sessionId, userId: user.id, deletedAt: null },
      select: { id: true },
    });
    if (!session) return json({ error: "Project not found." }, 404);
    await requireChannelAccess(user, channelId);
    const channel = await prisma.youtubeChannel.findUniqueOrThrow({ where: { id: channelId } });
    if (channel.status !== "ACTIVE") return json({ error: "Reconnect this YouTube channel first." }, 409);
    const auth = await getAuthedClientForChannel(channel);
    const uploadUrl = await runWithYoutubeUsage({ userId: user.id, channelId, sessionId }, () =>
      createResumableUpload(auth, {
        title,
        description,
        tags,
        privacy,
        publishAt,
        contentLength,
        contentType,
      }),
    );
    return json({ uploadUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start the YouTube upload.";
    const status = message === "UNAUTHORIZED" ? 401 : message === "CHANNEL_NOT_FOUND" ? 404 : 500;
    return json({ error: message.slice(0, 300) }, status);
  }
}
