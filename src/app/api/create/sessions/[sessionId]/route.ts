import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import {
  isDeletedVideoSession,
  isDeletedVideoSessionError,
} from "@/lib/session/deletion";
import { getSessionDocuments } from "@/lib/session/repo";

type RouteContext = { params: Promise<{ sessionId: string }> };

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { sessionId } = await params;
    if (!sessionId || sessionId.length > 100) {
      return Response.json({ error: "Invalid video ID." }, { status: 400 });
    }
    if (await isDeletedVideoSession(sessionId)) {
      return Response.json({ error: "Video was permanently deleted." }, { status: 410 });
    }

    const documents = await getSessionDocuments(sessionId, user.id);
    if (!documents) {
      return Response.json({ error: "Session not found." }, { status: 404 });
    }
    return Response.json(documents);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (isDeletedVideoSessionError(error)) {
      return Response.json({ error: "Video was permanently deleted." }, { status: 410 });
    }
    console.error("[video-session] documents load failed", error);
    return Response.json({ error: "Could not load session documents." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  try {
    const user = await requireUser();
    const { sessionId } = await params;
    if (!sessionId || sessionId.length > 100) {
      return Response.json({ error: "Invalid video ID." }, { status: 400 });
    }

    const existing = await prisma.videoSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });
    if (!existing) {
      const tombstone = await prisma.deletedVideoSession.upsert({
        where: { id: sessionId },
        create: { id: sessionId, userId: user.id },
        update: {},
        select: { userId: true },
      });
      if (tombstone.userId !== user.id) {
        return Response.json({ error: "Video not found." }, { status: 404 });
      }
      return Response.json({ ok: true });
    }
    if (existing.userId !== user.id) {
      return Response.json({ error: "Video not found." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.deletedVideoSession.upsert({
        where: { id: sessionId },
        create: { id: sessionId, userId: user.id },
        update: { deletedAt: new Date() },
      });
      await tx.videoSession.deleteMany({
        where: { id: sessionId, userId: user.id },
      });
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
    console.error("[video-session] permanent deletion failed", error);
    return Response.json({ error: "Could not permanently delete the video." }, { status: 500 });
  }
}
