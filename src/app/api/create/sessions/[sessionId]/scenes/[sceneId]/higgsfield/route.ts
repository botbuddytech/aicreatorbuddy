import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { isDeletedVideoSession } from "@/lib/session/deletion";
import {
  higgsfieldInsufficientCredits,
  readHiggsfieldStatus,
  submitHiggsfieldClip,
} from "@/features/higgsfield/api";
import {
  higgsfieldCredentialsForAccount,
  touchHiggsfieldAccount,
} from "@/features/higgsfield/accounts";
import { higgsfieldAspect, higgsfieldDurationNote } from "@/features/higgsfield/duration";
import { higgsfieldDurationFor, higgsfieldModel } from "@/features/higgsfield/models";
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

async function accountCredentials(userId: string, accountId: unknown) {
  if (typeof accountId !== "string" || !accountId.trim()) {
    throw new Error("Choose an enabled Higgsfield account.");
  }
  return higgsfieldCredentialsForAccount(userId, accountId.trim());
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

    const body = (await request.json().catch(() => null)) as {
      action?: unknown;
      prompt?: unknown;
      durationSeconds?: unknown;
      aspectRatio?: unknown;
      modelId?: unknown;
      requestId?: unknown;
      accountId?: unknown;
      previousStoragePath?: unknown;
    } | null;
    const credentials = await accountCredentials(user.id, body?.accountId);
    const accountId = typeof body?.accountId === "string" ? body.accountId : "";

    if (body?.action === "start") {
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      if (!prompt) return json({ error: "Generate a prompt for this scene before creating a clip." }, 400);
      const durationSeconds = typeof body.durationSeconds === "number" ? body.durationSeconds : 5;
      const model = higgsfieldModel(typeof body.modelId === "string" ? body.modelId : null);
      const sized = higgsfieldDurationFor(model, durationSeconds);
      const aspectRatio = higgsfieldAspect(typeof body.aspectRatio === "string" ? body.aspectRatio : "16:9");
      const submitted = await submitHiggsfieldClip(credentials, {
        prompt: prompt.slice(0, 2500),
        duration: sized.duration,
        aspectRatio,
        model,
        idempotencyKey: crypto.randomUUID(),
      });
      await touchHiggsfieldAccount(user.id, accountId);
      return json({
        requestId: submitted.requestId,
        status: submitted.status,
        durationSeconds: sized.duration,
        note: higgsfieldDurationNote(durationSeconds, sized.duration),
      });
    }

    if (body?.action !== "collect" || typeof body.requestId !== "string") {
      return json({ error: "Unknown Higgsfield action." }, 400);
    }

    const previousPath =
      typeof body.previousStoragePath === "string" && body.previousStoragePath.trim()
        ? body.previousStoragePath.trim()
        : null;
    if (previousPath && !isOwnedSceneClipPath(sessionId, sceneId, previousPath)) {
      return json({ error: "That clip does not belong to this scene." }, 400);
    }

    const job = await readHiggsfieldStatus(credentials, body.requestId);
    if (job.status === "failed" || job.status === "nsfw") {
      return json({ error: job.error || "Higgsfield could not generate this clip." }, 422);
    }
    if (job.status === "canceled" || job.status === "cancelled") {
      return json({ error: "Higgsfield canceled this clip." }, 422);
    }
    if (job.status !== "completed" || !job.videoUrl) {
      return json({ status: job.status });
    }

    const video = await fetch(job.videoUrl, { cache: "no-store" });
    if (!video.ok) return json({ error: "Higgsfield finished, but the video could not be downloaded." }, 502);
    const bytes = Buffer.from(await video.arrayBuffer());
    if (bytes.length <= 0 || bytes.length > SCENE_CLIP_MAX_BYTES) {
      return json({ error: "The generated clip is empty or larger than 100MB." }, 502);
    }
    const headerType = video.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    const extension = extensionForSceneClip(headerType) ?? "mp4";
    const contentType = extension === "mp4" ? "video/mp4" : headerType || "video/mp4";
    const clipId = crypto.randomUUID();
    const path = sceneClipObjectPath(sessionId, sceneId, clipId, extension);
    uploadedPath = path;
    const url = await uploadSceneClip({ path, bytes, contentType });

    if (previousPath && previousPath !== path) {
      try {
        await deleteSceneClip(previousPath);
      } catch (error) {
        await deleteSceneClip(path).catch(() => undefined);
        uploadedPath = null;
        const message = error instanceof Error ? error.message : "Could not replace the previous clip.";
        return json({ error: message }, 502);
      }
    }

    const durationSeconds = higgsfieldDurationFor(
      higgsfieldModel(typeof body.modelId === "string" ? body.modelId : null),
      typeof body.durationSeconds === "number" ? body.durationSeconds : 5,
    ).duration;

    return json({
      status: "completed",
      clip: { url, storagePath: path, clipId, durationSeconds },
    });
  } catch (error) {
    if (uploadedPath) await deleteSceneClip(uploadedPath).catch(() => undefined);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return json({ error: "Unauthorized." }, 401);
    }
    const message = error instanceof Error ? error.message : "Could not generate that clip.";
    console.error("[higgsfield] scene clip failed", message);
    const status = higgsfieldInsufficientCredits(error)
      ? 403
      : /rejected this API key|Choose an enabled/i.test(message)
        ? 401
        : 502;
    return json({ error: message, insufficientCredits: status === 403 }, status);
  }
}
