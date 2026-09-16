import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { jsonValue } from "@/lib/session/server";
import {
  fetchReferenceTranscript,
  parseYoutubeVideoId,
} from "@/lib/youtube/transcript";

type RouteContext = { params: Promise<{ sessionId: string }> };

export const maxDuration = 60;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function ensureOwnedSession(sessionId: string, userId: string): Promise<boolean> {
  const existing = await prisma.videoSession.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  });
  if (existing && existing.userId !== userId) return false;
  if (!existing) {
    await prisma.videoSession.create({ data: { id: sessionId, userId } });
  }
  return true;
}

async function updateReferenceCount(sessionId: string) {
  const referenceCount = await prisma.videoSessionReference.count({
    where: { sessionId, removedAt: null },
  });
  await prisma.videoSession.update({
    where: { id: sessionId },
    data: { referenceCount, lastActiveAt: new Date() },
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { sessionId } = await params;
    const raw = await request.json();
    if (!isObject(raw)) {
      return Response.json({ error: "Invalid request.", code: "INVALID_REQUEST" }, { status: 400 });
    }
    const referenceKey =
      typeof raw.referenceKey === "string" ? raw.referenceKey.trim() : "";
    const url = typeof raw.url === "string" ? raw.url.trim() : "";
    const lang = typeof raw.lang === "string" && raw.lang.trim() ? raw.lang.trim() : undefined;
    const order =
      typeof raw.order === "number" && Number.isInteger(raw.order)
        ? Math.max(0, Math.min(4, raw.order))
        : 0;
    if (!referenceKey || referenceKey.length > 100 || url.length > 2_048) {
      return Response.json({ error: "Invalid reference.", code: "INVALID_REQUEST" }, { status: 400 });
    }
    const videoId = parseYoutubeVideoId(url);
    if (!videoId) {
      return Response.json(
        { error: "Enter a valid YouTube video link.", code: "INVALID_URL" },
        { status: 400 },
      );
    }
    if (!(await ensureOwnedSession(sessionId, user.id))) {
      return Response.json({ error: "Session not found." }, { status: 404 });
    }

    await prisma.videoSessionReference.upsert({
      where: { sessionId_referenceKey: { sessionId, referenceKey } },
      create: {
        sessionId,
        referenceKey,
        order,
        url,
        videoId,
        status: "FETCHING",
        source: "fetched",
      },
      update: {
        order,
        url,
        videoId,
        status: "FETCHING",
        source: "fetched",
        errorCode: null,
        errorMessage: null,
        removedAt: null,
      },
    });

    const result = await fetchReferenceTranscript(videoId, lang);
    if (!result.ok) {
      await prisma.videoSessionReference.update({
        where: { sessionId_referenceKey: { sessionId, referenceKey } },
        data: {
          status: "FAILED",
          errorCode: result.code,
          errorMessage: result.message,
          fetchedAt: null,
        },
      });
      await updateReferenceCount(sessionId);
      return Response.json(
        { ok: false, referenceKey, code: result.code, error: result.message },
        { status: result.code === "RATE_LIMITED" ? 429 : 422 },
      );
    }

    const fetchedAt = new Date();
    await prisma.videoSessionReference.update({
      where: { sessionId_referenceKey: { sessionId, referenceKey } },
      data: {
        status: "READY",
        source: "fetched",
        lang: result.lang,
        transcript: result.transcript,
        segments: jsonValue(result.segments),
        charCount: result.charCount,
        wordCount: result.wordCount,
        durationSec: result.durationSec,
        errorCode: null,
        errorMessage: null,
        fetchedAt,
        removedAt: null,
      },
    });
    await updateReferenceCount(sessionId);

    return Response.json({
      ok: true,
      referenceKey,
      transcript: result.transcript,
      lang: result.lang,
      wordCount: result.wordCount,
      charCount: result.charCount,
      durationSec: result.durationSec,
      fetchedAt: fetchedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
    console.error("[video-session] reference transcript fetch failed", error);
    return Response.json({ error: "Could not fetch the transcript." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { sessionId } = await params;
    const referenceKey = new URL(request.url).searchParams.get("referenceKey")?.trim();
    if (!referenceKey) {
      return Response.json({ error: "Reference key is required." }, { status: 400 });
    }
    const existing = await prisma.videoSession.findFirst({
      where: { id: sessionId, userId: user.id },
      select: { id: true },
    });
    if (!existing) {
      return Response.json({ error: "Session not found." }, { status: 404 });
    }
    await prisma.videoSessionReference.deleteMany({
      where: { sessionId, referenceKey },
    });
    await updateReferenceCount(sessionId);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
    console.error("[video-session] reference removal failed", error);
    return Response.json({ error: "Could not remove the reference." }, { status: 500 });
  }
}
