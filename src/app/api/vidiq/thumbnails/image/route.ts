import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isDeletedVideoSession } from "@/lib/session/deletion";
import { isThumbnailId } from "@/lib/storage/thumbnails";
import { generateVidiqThumbnailImage } from "@/lib/vidiq/generateThumbnailImage";
import { VidiqError } from "@/lib/vidiq/client";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_REQUEST_BYTES = 12_000;

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
  thumbnailId: string;
  prompt: string;
  title?: string;
  format: "long" | "short";
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  const thumbnailId = typeof body.thumbnailId === "string" ? body.thumbnailId.trim() : "";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!isThumbnailId(sessionId) || !isThumbnailId(thumbnailId) || !prompt || prompt.length > 2000) {
    return null;
  }
  if (title.length > 500) return null;
  const format =
    body.format === "shorts" || body.format === "short" ? "short" : "long";
  return {
    sessionId,
    thumbnailId,
    prompt,
    ...(title ? { title } : {}),
    format,
  };
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
    if (!input) return Response.json({ error: "A thumbnail prompt is required." }, { status: 400 });
    if (await isDeletedVideoSession(input.sessionId)) {
      return Response.json({ error: "Video was permanently deleted." }, { status: 410 });
    }

    const session = await prisma.videoSession.findFirst({
      where: { id: input.sessionId, userId: user.id },
      select: { id: true, channel: { select: { channelId: true } } },
    });
    if (!session) return Response.json({ error: "Session not found." }, { status: 404 });

    const url = await generateVidiqThumbnailImage({
      userId: user.id,
      sessionId: session.id,
      channelId: session.channel?.channelId,
      thumbnailId: input.thumbnailId,
      prompt: input.prompt,
      title: input.title,
      format: input.format,
    });
    return Response.json({ url }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof VidiqError) return vidiqErrorResponse(error);
    const message = error instanceof Error ? error.message : "vidIQ could not generate the thumbnail.";
    console.error("[vidiq] thumbnail image generation failed", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
