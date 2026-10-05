import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isDeletedVideoSession } from "@/lib/session/deletion";
import { isThumbnailId } from "@/lib/storage/thumbnails";
import { callVidiqTool, VidiqError } from "@/lib/vidiq/client";
import { insightFromThumbnailScore, thumbnailScoreFromResult } from "@/lib/vidiq/scoreThumbnail";
import { thumbnailImageDataUri } from "@/lib/vidiq/thumbnailImageData";
import { parseYoutubeVideoId } from "@/lib/youtube/transcript";
import type { VidIqThumbInsight } from "@/lib/videoProject";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_REQUEST_BYTES = 32_000;

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function parseBody(value: unknown): {
  sessionId: string;
  title: string;
  videoId: string;
  thumbnails: { id: string; imageUrl: string }[];
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const videoRaw = typeof body.videoId === "string" ? body.videoId.trim() : "";
  const videoId = parseYoutubeVideoId(videoRaw) ?? (/^[A-Za-z0-9_-]{6,20}$/.test(videoRaw) ? videoRaw : "");
  if (!isThumbnailId(sessionId) || !title || title.length > 500 || !videoId) return null;
  if (!Array.isArray(body.thumbnails) || body.thumbnails.length < 1 || body.thumbnails.length > 8) {
    return null;
  }
  const thumbnails: { id: string; imageUrl: string }[] = [];
  for (const item of body.thumbnails) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const imageUrl = typeof row.imageUrl === "string" ? row.imageUrl.trim() : "";
    if (!isThumbnailId(id) || !imageUrl.startsWith("https://") || imageUrl.length > 2000) return null;
    thumbnails.push({ id, imageUrl });
  }
  return { sessionId, title, videoId, thumbnails };
}

function vidiqErrorResponse(error: VidiqError) {
  const status =
    error.code === "not-connected" || error.code === "disabled"
      ? 409
      : error.code === "out-of-credits"
        ? 402
        : error.code === "needs-reauth"
          ? 401
          : 502;
  return Response.json(
    { error: error.message, code: error.code },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return Response.json({ error: "Request is too large." }, { status: 413 });
  }

  try {
    const user = await requireUser();
    const rawBody = await request.text();
    if (rawBody.length > MAX_REQUEST_BYTES) {
      return Response.json({ error: "Request is too large." }, { status: 413 });
    }
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }
    const input = parseBody(body);
    if (!input) {
      return Response.json(
        { error: "A title, a reference YouTube video, and thumbnail images are required." },
        { status: 400 },
      );
    }
    if (await isDeletedVideoSession(input.sessionId)) {
      return Response.json({ error: "Video was permanently deleted." }, { status: 410 });
    }
    const session = await prisma.videoSession.findFirst({
      where: { id: input.sessionId, userId: user.id },
      select: { id: true, channel: { select: { channelId: true } } },
    });
    if (!session) return Response.json({ error: "Session not found." }, { status: 404 });

    const insights: Record<string, VidIqThumbInsight> = {};
    for (const thumb of input.thumbnails) {
      const image = await thumbnailImageDataUri(thumb.imageUrl);
      const result = await callVidiqTool<unknown>(
        user.id,
        "vidiq_score_thumbnail",
        {
          videoId: input.videoId,
          title: input.title,
          image,
        },
        {
          sessionId: session.id,
          step: "THUMBNAIL",
          channelId: session.channel?.channelId,
        },
      );
      const score = thumbnailScoreFromResult(result);
      if (!score) throw new Error("vidIQ returned an invalid thumbnail score.");
      insights[thumb.id] = insightFromThumbnailScore(score);
    }
    return Response.json({ insights }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof VidiqError) return vidiqErrorResponse(error);
    const message = error instanceof Error ? error.message : "vidIQ could not score the thumbnails.";
    console.error("[vidiq] thumbnail scoring failed", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
