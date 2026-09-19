import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { parseEventBatch, type SessionEventInput } from "@/lib/session/contract";
import {
  isDeletedVideoSession,
  isDeletedVideoSessionError,
} from "@/lib/session/deletion";
import { jsonValue, safeDate, toCreateStep } from "@/lib/session/server";

type RouteContext = { params: Promise<{ sessionId: string }> };

function text(payload: Record<string, unknown>, key: string): string | null {
  return typeof payload[key] === "string" ? payload[key] as string : null;
}

function number(payload: Record<string, unknown>, key: string): number | null {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function persistExport(
  tx: Prisma.TransactionClient,
  sessionId: string,
  item: SessionEventInput,
) {
  if (!item.type.startsWith("export.")) return;
  const exportId = text(item.payload, "exportId");
  if (!exportId) return;
  const status = item.type.slice("export.".length).toUpperCase() as
    "STARTED" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  const at = safeDate(item.at);
  const base = {
    sessionId,
    attempt: Math.max(1, Math.round(number(item.payload, "attempt") ?? 1)),
    status,
    fileName: text(item.payload, "fileName"),
    format: text(item.payload, "format") ?? "unknown",
    aspectRatio: text(item.payload, "aspectRatio") ?? "unknown",
    resolution: text(item.payload, "resolution") ?? "unknown",
    runtimeSec: number(item.payload, "runtimeSec") ?? 0,
    sceneCount: Math.max(0, Math.round(number(item.payload, "sceneCount") ?? 0)),
    durationMs: number(item.payload, "durationMs"),
    errorMessage: text(item.payload, "errorMessage"),
    startedAt: safeDate(text(item.payload, "startedAt") ?? item.at),
    finishedAt: status === "STARTED" ? null : at,
  };
  await tx.videoSessionExport.upsert({
    where: { id: exportId },
    create: { id: exportId, ...base },
    update: {
      status,
      fileName: base.fileName,
      durationMs: base.durationMs,
      errorMessage: base.errorMessage,
      finishedAt: base.finishedAt,
    },
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { sessionId } = await params;
    if (await isDeletedVideoSession(sessionId)) {
      return Response.json({ error: "Video was permanently deleted." }, { status: 410 });
    }
    const body = await request.json();
    const events = parseEventBatch(body);
    if (!events) {
      return Response.json({ error: "Invalid event batch." }, { status: 400 });
    }

    const existing = await prisma.videoSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });
    if (existing && existing.userId !== user.id) {
      return Response.json({ error: "Session not found." }, { status: 404 });
    }
    if (!existing) {
      await prisma.videoSession.create({ data: { id: sessionId, userId: user.id } });
    }

    const known = await prisma.videoSessionEvent.findMany({
      where: { clientEventId: { in: events.map((item) => item.clientEventId) } },
      select: { clientEventId: true },
    });
    const knownIds = new Set(known.map((item) => item.clientEventId));
    const fresh = events.filter((item) => !knownIds.has(item.clientEventId));
    if (!fresh.length) return Response.json({ ok: true, accepted: 0 });

    await prisma.$transaction(async (tx) => {
      await tx.videoSessionEvent.createMany({
        data: fresh.map((item) => ({
          sessionId,
          clientEventId: item.clientEventId,
          type: item.type,
          step: item.step ? toCreateStep(item.step) : null,
          at: safeDate(item.at),
          sequence: item.sequence,
          payload: jsonValue(item.payload),
        })),
        skipDuplicates: true,
      });

      for (const item of fresh) {
        await persistExport(tx, sessionId, item);
        if (item.step && item.type === "step.entered") {
          const step = toCreateStep(item.step);
          await tx.videoSessionStep.upsert({
            where: { sessionId_step: { sessionId, step } },
            create: {
              sessionId,
              step,
              visitCount: 1,
              enteredAt: safeDate(item.at),
            },
            update: {
              visitCount: { increment: 1 },
              enteredAt: safeDate(item.at),
            },
          });
        }
        if (item.step && item.type === "step.approved") {
          const step = toCreateStep(item.step);
          await tx.videoSessionStep.upsert({
            where: { sessionId_step: { sessionId, step } },
            create: {
              sessionId,
              step,
              state: "APPROVED",
              approvedAt: safeDate(item.at),
            },
            update: { state: "APPROVED", approvedAt: safeDate(item.at) },
          });
        }
        if (item.step && item.type === "generation.completed") {
          const step = toCreateStep(item.step);
          await tx.videoSessionStep.upsert({
            where: { sessionId_step: { sessionId, step } },
            create: {
              sessionId,
              step,
              generationCount: 1,
              firstGeneratedAt: safeDate(item.at),
            },
            update: { generationCount: { increment: 1 } },
          });
        }
        if (item.step && item.type === "api.call") {
          const step = toCreateStep(item.step);
          await tx.videoSessionStep.upsert({
            where: { sessionId_step: { sessionId, step } },
            create: { sessionId, step, apiCallCount: 1 },
            update: { apiCallCount: { increment: 1 } },
          });
        }
        if (item.type === "asset.clip_added") {
          const localClipId = text(item.payload, "localClipId");
          if (localClipId) {
            await tx.videoSessionAsset.upsert({
              where: { sessionId_localClipId: { sessionId, localClipId } },
              create: {
                sessionId,
                localClipId,
                sceneKey: text(item.payload, "sceneKey"),
                kind: "UPLOADED_CLIP",
                source: "MANUAL_UPLOAD",
                addedAtStep: toCreateStep(item.step ?? "timeline"),
                fileName: text(item.payload, "fileName"),
                mimeType: text(item.payload, "mimeType"),
                sizeBytes: number(item.payload, "sizeBytes"),
                durationSec: number(item.payload, "durationSec"),
                addedAt: safeDate(item.at),
              },
              update: {
                fileName: text(item.payload, "fileName") ?? undefined,
                mimeType: text(item.payload, "mimeType") ?? undefined,
                sizeBytes: number(item.payload, "sizeBytes") ?? undefined,
                durationSec: number(item.payload, "durationSec") ?? undefined,
                removedAt: null,
              },
            });
          }
        }
      }

      const apiCalls = fresh.filter((item) => item.type === "api.call").length;
      const generations = fresh.filter((item) => item.type === "generation.completed").length;
      const regenerations = fresh.filter(
        (item) => item.type === "generation.completed" && item.payload.regenerated === true,
      ).length;
      const manualClips = fresh.filter((item) => item.type === "asset.clip_added").length;
      const aiVisuals = fresh.filter(
        (item) => item.type === "generation.completed" && text(item.payload, "kind") === "sceneVisuals",
      ).length;
      const exportsStarted = fresh.filter((item) => item.type === "export.started").length;
      const exportsSucceeded = fresh.filter((item) => item.type === "export.succeeded").length;
      const rendered = fresh.some((item) => item.type === "render.completed");
      const deleted = fresh.some((item) => item.type === "session.deleted");
      const enteredStep = [...fresh].reverse().find(
        (item) => item.type === "step.entered" && item.step,
      )?.step;
      const update = {
        lastActiveAt: new Date(),
        ...(enteredStep ? { currentStep: toCreateStep(enteredStep) } : {}),
        ...(apiCalls ? { apiCallCount: { increment: apiCalls } } : {}),
        ...(generations ? { generationCount: { increment: generations } } : {}),
        ...(regenerations ? { regenerateCount: { increment: regenerations } } : {}),
        ...(manualClips ? { manualClipCount: { increment: manualClips } } : {}),
        ...(aiVisuals ? { aiVisualCount: { increment: aiVisuals } } : {}),
        ...(exportsStarted ? { exportAttemptCount: { increment: exportsStarted } } : {}),
        ...(exportsSucceeded ? { exportSuccessCount: { increment: exportsSucceeded } } : {}),
        ...(rendered ? { status: "RENDERED" as const, renderedAt: new Date() } : {}),
        ...(exportsSucceeded
          ? { status: "EXPORTED" as const, firstExportedAt: new Date() }
          : {}),
        ...(deleted ? { deletedAt: new Date(), status: "ABANDONED" as const } : {}),
      };
      await tx.videoSession.update({ where: { id: sessionId }, data: update });
    });

    return Response.json({ ok: true, accepted: fresh.length });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (isDeletedVideoSessionError(error)) {
      return Response.json({ error: "Video was permanently deleted." }, { status: 410 });
    }
    console.error("[video-session] event ingest failed", error);
    return Response.json({ error: "Could not record session events." }, { status: 500 });
  }
}
