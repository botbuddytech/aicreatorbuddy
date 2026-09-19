import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

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
