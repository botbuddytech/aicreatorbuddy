import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { isDeletedVideoSession } from "@/lib/session/deletion";
import {
  extensionForSceneClip,
  isOwnedSceneClipPath,
  isSceneClipId,
  SCENE_CLIP_MAX_BYTES,
  sceneClipObjectPath,
} from "@/lib/storage/sceneClipPath";
import { deleteSceneClip, uploadSceneClip } from "@/lib/storage/sceneClips";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ sessionId: string; sceneId: string }> };

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

async function ownedSession(sessionId: string, sceneId: string, userId: string) {
  if (!isSceneClipId(sessionId) || !isSceneClipId(sceneId)) return "invalid" as const;
  if (await isDeletedVideoSession(sessionId)) return "deleted" as const;
  const session = await prisma.videoSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true },
  });
  return session ? ("ok" as const) : ("missing" as const);
}

export async function POST(request: Request, { params }: RouteContext) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin requests are not allowed." }, 403);

  let uploadedPath: string | null = null;
  try {
    const user = await requireUser();
    const { sessionId, sceneId } = await params;
    const access = await ownedSession(sessionId, sceneId, user.id);
    if (access === "invalid") return json({ error: "Invalid scene." }, 400);
    if (access === "deleted") return json({ error: "Video was permanently deleted." }, 410);
    if (access === "missing") return json({ error: "Session not found." }, 404);

    const form = await request.formData();
    const file = form.get("file");
    const previous = form.get("previousStoragePath");
    const previousPath = typeof previous === "string" && previous.trim() ? previous.trim() : null;
    if (!(file instanceof File)) return json({ error: "Choose a video or image file." }, 400);
    const extension = extensionForSceneClip(file.type);
    if (!extension) {
      return json({ error: "Use an MP4, WebM, MOV, JPEG, PNG, WebP, or GIF file." }, 400);
    }
    if (file.size <= 0 || file.size > SCENE_CLIP_MAX_BYTES) {
      return json({ error: "Clip must be under 100MB." }, 400);
    }
    if (previousPath && !isOwnedSceneClipPath(sessionId, sceneId, previousPath)) {
      return json({ error: "That clip does not belong to this scene." }, 400);
    }

    const clipId = crypto.randomUUID();
    const path = sceneClipObjectPath(sessionId, sceneId, clipId, extension);
    uploadedPath = path;
    const url = await uploadSceneClip({
      path,
      bytes: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
    });

    if (previousPath && previousPath !== path) {
      try {
        await deleteSceneClip(previousPath);
      } catch (error) {
        await deleteSceneClip(path).catch(() => undefined);
        uploadedPath = null;
        const message = error instanceof Error ? error.message : "Could not delete the previous clip.";
        return json({ error: message }, 502);
      }
    }

    return json({ url, storagePath: path, clipId });
  } catch (error) {
    if (uploadedPath) await deleteSceneClip(uploadedPath).catch(() => undefined);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return json({ error: "Unauthorized." }, 401);
    }
    const message = error instanceof Error ? error.message : "Could not upload that clip.";
    console.error("[scene-clips] upload failed", message);
    return json({ error: message }, 502);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin requests are not allowed." }, 403);

  try {
    const user = await requireUser();
    const { sessionId, sceneId } = await params;
    const access = await ownedSession(sessionId, sceneId, user.id);
    if (access === "invalid") return json({ error: "Invalid scene." }, 400);
    if (access === "deleted") return json({ error: "Video was permanently deleted." }, 410);
    if (access === "missing") return json({ error: "Session not found." }, 404);

    const body = (await request.json().catch(() => null)) as { storagePath?: unknown } | null;
    const storagePath = typeof body?.storagePath === "string" ? body.storagePath.trim() : "";
    if (!isOwnedSceneClipPath(sessionId, sceneId, storagePath)) {
      return json({ error: "That clip does not belong to this scene." }, 400);
    }
    await deleteSceneClip(storagePath);
    return json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return json({ error: "Unauthorized." }, 401);
    }
    const message = error instanceof Error ? error.message : "Could not delete that clip.";
    console.error("[scene-clips] delete failed", message);
    return json({ error: message }, 502);
  }
}
