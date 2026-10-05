import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import {
  isDeletedVideoSession,
  isDeletedVideoSessionError,
} from "@/lib/session/deletion";
import { jsonValue } from "@/lib/session/server";
import {
  metadataWithReferenceTitle,
  referenceTitleFromMetadata,
} from "@/lib/videoProject";
import {
  fetchReferenceTranscript,
  fetchYoutubeVideoTitle,
  MAX_TRANSCRIPT_CHARS,
  parseYoutubeVideoId,
} from "@/lib/youtube/transcript";

type RouteContext = { params: Promise<{ sessionId: string }> };

export const maxDuration = 60;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

type StoredReferenceInput = {
  referenceKey: string;
  order: number;
  url: string;
  title: string;
  transcript: string;
  lang: string | null;
  source: "manual" | "fetched";
  fetchedAt: string | null;
};

function parseStoredReferences(raw: Record<string, unknown>): StoredReferenceInput[] | null {
  if (!Array.isArray(raw.references) || raw.references.length > 5) return null;
  const references: StoredReferenceInput[] = [];
  for (const item of raw.references) {
    if (!isObject(item)) return null;
    const referenceKey = typeof item.referenceKey === "string" ? item.referenceKey.trim() : "";
    const url = typeof item.url === "string" ? item.url.trim() : "";
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const transcript = typeof item.transcript === "string" ? item.transcript : "";
    const lang = typeof item.lang === "string" && item.lang.trim() ? item.lang.trim() : null;
    const source = item.source === "fetched" ? "fetched" : item.source === "manual" ? "manual" : null;
    const fetchedAt =
      typeof item.fetchedAt === "string" && !Number.isNaN(Date.parse(item.fetchedAt))
        ? item.fetchedAt
        : null;
    const order = item.order;
    if (
      !referenceKey ||
      referenceKey.length > 100 ||
      url.length > 2_048 ||
      title.length > 200 ||
      transcript.length > MAX_TRANSCRIPT_CHARS ||
      !source ||
      typeof order !== "number" ||
      !Number.isInteger(order) ||
      order < 0 ||
      order > 4
    ) {
      return null;
    }
    references.push({ referenceKey, order, url, title, transcript, lang, source, fetchedAt });
  }
  return references;
}

function wordCount(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
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

async function commitStoredReferences(
  sessionId: string,
  userId: string,
  raw: Record<string, unknown>,
) {
  const references = parseStoredReferences(raw);
  if (!references) {
    return Response.json({ error: "Invalid references.", code: "INVALID_REQUEST" }, { status: 400 });
  }
  if (!(await ensureOwnedSession(sessionId, userId))) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }

  const keys = references.map((reference) => reference.referenceKey);
  await prisma.$transaction(async (tx) => {
    if (keys.length) {
      await tx.videoSessionReference.deleteMany({
        where: { sessionId, referenceKey: { notIn: keys } },
      });
    } else {
      await tx.videoSessionReference.deleteMany({ where: { sessionId } });
    }
    for (const reference of references) {
      const transcript = reference.transcript.trim();
      const words = wordCount(transcript);
      const metadata = metadataWithReferenceTitle({}, reference.title);
      const data = {
        order: reference.order,
        url: reference.url,
        videoId: parseYoutubeVideoId(reference.url),
        status: transcript ? ("READY" as const) : ("EMPTY" as const),
        source: reference.source,
        lang: reference.lang,
        transcript: reference.transcript.slice(0, MAX_TRANSCRIPT_CHARS),
        metadata: jsonValue(metadata),
        charCount: reference.transcript.slice(0, MAX_TRANSCRIPT_CHARS).length,
        wordCount: words,
        fetchedAt: reference.fetchedAt ? new Date(reference.fetchedAt) : null,
        errorCode: null,
        errorMessage: null,
        removedAt: null,
      };
      await tx.videoSessionReference.upsert({
        where: { sessionId_referenceKey: { sessionId, referenceKey: reference.referenceKey } },
        create: { sessionId, referenceKey: reference.referenceKey, ...data },
        update: data,
      });
    }
    await tx.videoSession.update({
      where: { id: sessionId },
      data: { referenceCount: references.length },
    });
  });
  return Response.json({ ok: true });
}

export async function POST(request: Request, { params }: RouteContext) {
  let requestedSessionId: string | null = null;
  try {
    const user = await requireUser();
    const { sessionId } = await params;
    requestedSessionId = sessionId;
    if (await isDeletedVideoSession(sessionId)) {
      return Response.json({ error: "Video was permanently deleted." }, { status: 410 });
    }
    const raw = await request.json();
    if (!isObject(raw)) {
      return Response.json({ error: "Invalid request.", code: "INVALID_REQUEST" }, { status: 400 });
    }
    if (raw.mode === "commit") {
      return commitStoredReferences(sessionId, user.id, raw);
    }
    const persist = raw.persist !== false;
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
    if (persist && !(await ensureOwnedSession(sessionId, user.id))) {
      return Response.json({ error: "Session not found." }, { status: 404 });
    }

    if (persist) {
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
    }

    const [result, fetchedTitle] = await Promise.all([
      fetchReferenceTranscript(videoId, lang),
      fetchYoutubeVideoTitle(videoId),
    ]);
    if (!result.ok) {
      if (persist) {
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
      }
      return Response.json(
        { ok: false, referenceKey, code: result.code, error: result.message },
        { status: result.code === "RATE_LIMITED" ? 429 : 422 },
      );
    }
    if (!persist) {
      const transcript = result.transcript;
      return Response.json({
        ok: true,
        referenceKey,
        title: fetchedTitle ?? "",
        transcript,
        lang: result.lang,
        wordCount: result.wordCount,
        charCount: result.charCount,
        durationSec: result.durationSec,
        fetchedAt: new Date().toISOString(),
      });
    }

    const fetchedAt = new Date();
    const stored = await prisma.videoSessionReference.findUnique({
      where: { sessionId_referenceKey: { sessionId, referenceKey } },
      select: { metadata: true },
    });
    const metadata = metadataWithReferenceTitle(stored?.metadata, fetchedTitle ?? "");
    const title = referenceTitleFromMetadata(metadata);
    await prisma.videoSessionReference.update({
      where: { sessionId_referenceKey: { sessionId, referenceKey } },
      data: {
        status: "READY",
        source: "fetched",
        lang: result.lang,
        transcript: result.transcript,
        segments: jsonValue(result.segments),
        metadata: jsonValue(metadata),
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
      title,
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
    if (
      isDeletedVideoSessionError(error) ||
      (requestedSessionId && await isDeletedVideoSession(requestedSessionId))
    ) {
      return Response.json({ error: "Video was permanently deleted." }, { status: 410 });
    }
    console.error("[video-session] reference transcript fetch failed", error);
    return Response.json({ error: "Could not fetch the transcript." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { sessionId } = await params;
    if (await isDeletedVideoSession(sessionId)) {
      return Response.json({ error: "Video was permanently deleted." }, { status: 410 });
    }
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
