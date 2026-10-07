import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { requireChannelAccess } from "@/lib/youtube/access";
import { getAuthedClientForChannel } from "@/lib/youtube/oauth";
import { rememberUploadedVideo, setYoutubeThumbnail } from "@/lib/youtube/upload";
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
      videoId?: unknown;
      thumbnailBase64?: unknown;
      thumbnailType?: unknown;
    };
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const channelId = typeof body.channelId === "string" ? body.channelId : "";
    const videoId = typeof body.videoId === "string" ? body.videoId : "";
    if (!sessionId || !channelId || !videoId) return json({ error: "Missing upload result." }, 400);
    const session = await prisma.videoSession.findFirst({
      where: { id: sessionId, userId: user.id, deletedAt: null },
      select: { id: true },
    });
    if (!session) return json({ error: "Project not found." }, 404);
    await requireChannelAccess(user, channelId);
    const channel = await prisma.youtubeChannel.findUniqueOrThrow({ where: { id: channelId } });
    const auth = await getAuthedClientForChannel(channel);
    let thumbnailWarning: string | null = null;
    await runWithYoutubeUsage({ userId: user.id, channelId, sessionId }, async () => {
      if (typeof body.thumbnailBase64 === "string" && body.thumbnailBase64) {
        try {
          const bytes = Buffer.from(body.thumbnailBase64, "base64");
          if (bytes.byteLength > 2_000_000) throw new Error("Thumbnail must be under 2 MB.");
          const mime = typeof body.thumbnailType === "string" ? body.thumbnailType : "image/jpeg";
          await setYoutubeThumbnail(auth, videoId, bytes, mime);
        } catch (error) {
          thumbnailWarning = error instanceof Error ? error.message : "Thumbnail was not set.";
        }
      }
      await rememberUploadedVideo({ channelDbId: channelId, auth, youtubeVideoId: videoId, sessionId });
    });
    return json({
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnailWarning,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not finish the YouTube upload.";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return json({ error: message.slice(0, 300) }, status);
  }
}
