import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { isDeletedVideoSession } from "@/lib/session/deletion";
import {
  extensionForImage,
  isThumbnailId,
  uploadThumbnailImage,
} from "@/lib/storage/thumbnails";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

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

export async function POST(request: Request, { params }: RouteContext) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  try {
    const user = await requireUser();
    const { sessionId } = await params;
    if (!isThumbnailId(sessionId)) {
      return Response.json({ error: "Invalid session." }, { status: 400 });
    }
    if (await isDeletedVideoSession(sessionId)) {
      return Response.json({ error: "Video was permanently deleted." }, { status: 410 });
    }

    const session = await prisma.videoSession.findFirst({
      where: { id: sessionId, userId: user.id },
      select: { id: true },
    });
    if (!session) return Response.json({ error: "Session not found." }, { status: 404 });

    const form = await request.formData();
    const thumbnailId = form.get("thumbnailId");
    const file = form.get("file");
    if (typeof thumbnailId !== "string" || !isThumbnailId(thumbnailId)) {
      return Response.json({ error: "Invalid thumbnail." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return Response.json({ error: "Choose an image file." }, { status: 400 });
    }
    if (!extensionForImage(file.type)) {
      return Response.json({ error: "Use a JPEG, PNG, WebP, or GIF image." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "Image must be under 5 MB." }, { status: 400 });
    }

    const url = await uploadThumbnailImage({
      sessionId,
      thumbnailId,
      bytes: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
    });
    return Response.json({ url }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Could not upload the image.";
    console.error("[thumbnails] image upload failed", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
