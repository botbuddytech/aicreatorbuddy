import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { parseSessionSnapshot } from "@/lib/session/contract";
import {
  isDeletedVideoSession,
  isDeletedVideoSessionError,
} from "@/lib/session/deletion";
import { jsonValue, safeDate, toCreateStep, toStepState } from "@/lib/session/server";
import { withWriteRetry } from "@/lib/session/writeRetry";
import { metadataWithReferenceTitle, normalizeIntentCategory } from "@/lib/videoProject";
import { requireChannelAccess } from "@/lib/youtube/access";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { sessionId } = await params;
    if (await isDeletedVideoSession(sessionId)) {
      return Response.json({ error: "Video was permanently deleted." }, { status: 410 });
    }
    const snapshot = parseSessionSnapshot(await request.json());
    if (!snapshot || snapshot.id !== sessionId) {
      return Response.json({ error: "Invalid session snapshot." }, { status: 400 });
    }

    const existing = await prisma.videoSession.findUnique({
      where: { id: sessionId },
      select: {
        userId: true,
        lastActiveAt: true,
        steps: {
          where: { schemaVersion: { gte: 1 } },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (existing && existing.userId !== user.id) {
      return Response.json({ error: "Session not found." }, { status: 404 });
    }
    const incomingActiveAt = Date.parse(snapshot.lastActiveAt);
    if (
      existing &&
      existing.steps.length > 0 &&
      Number.isFinite(incomingActiveAt) &&
      existing.lastActiveAt.getTime() > incomingActiveAt
    ) {
      return Response.json({ ok: true, ignored: true });
    }

    let channelTitle: string | null = null;
    if (snapshot.channelId) {
      await requireChannelAccess(user, snapshot.channelId);
      const channel = await prisma.youtubeChannel.findUnique({
        where: { id: snapshot.channelId },
        select: { title: true },
      });
      if (!channel) {
        return Response.json({ error: "Target channel not found." }, { status: 400 });
      }
      channelTitle = channel.title;
    }

    await withWriteRetry(() => prisma.$transaction(async (tx) => {
      await tx.videoSession.upsert({
        where: { id: sessionId },
        create: {
          id: sessionId,
          userId: user.id,
          name: snapshot.name,
          currentStep: toCreateStep(snapshot.currentStep),
          channelId: snapshot.channelId,
          channelTitle,
          topic: snapshot.topic,
          format: snapshot.format,
          aspectRatio: snapshot.aspectRatio,
          intent: snapshot.intent,
          intentCategory: normalizeIntentCategory(
            snapshot.intent === "entertainment" ? "entertainment" : "educational",
            snapshot.intentCategory,
          ),
          targetDurationSec: snapshot.targetDurationSec,
          referenceCount: snapshot.referenceCount,
          sceneCount: snapshot.sceneCount,
          timelineSeconds: Math.round(snapshot.timelineSeconds),
          approvedStepCount: snapshot.approvedStepCount,
          apiCallCount: snapshot.apiCalls.length,
          generationCount: snapshot.apiCalls.length,
          manualClipCount: snapshot.assets.filter((asset) => asset.source === "MANUAL_UPLOAD").length,
          estimatedCostUsd: snapshot.estimatedCostUsd,
          renderedAt: snapshot.renderedAt ? safeDate(snapshot.renderedAt) : null,
          status: snapshot.renderedAt ? "RENDERED" : "DRAFT",
          createdAt: safeDate(snapshot.createdAt),
          lastActiveAt: safeDate(snapshot.lastActiveAt),
        },
        update: {
          name: snapshot.name,
          currentStep: toCreateStep(snapshot.currentStep),
          channelId: snapshot.channelId,
          channelTitle,
          topic: snapshot.topic,
          format: snapshot.format,
          aspectRatio: snapshot.aspectRatio,
          intent: snapshot.intent,
          intentCategory: normalizeIntentCategory(
            snapshot.intent === "entertainment" ? "entertainment" : "educational",
            snapshot.intentCategory,
          ),
          targetDurationSec: snapshot.targetDurationSec,
          referenceCount: snapshot.referenceCount,
          sceneCount: snapshot.sceneCount,
          timelineSeconds: Math.round(snapshot.timelineSeconds),
          approvedStepCount: snapshot.approvedStepCount,
          apiCallCount: snapshot.apiCalls.length,
          generationCount: snapshot.apiCalls.length,
          manualClipCount: snapshot.assets.filter((asset) => asset.source === "MANUAL_UPLOAD").length,
          estimatedCostUsd: snapshot.estimatedCostUsd,
          renderedAt: snapshot.renderedAt ? safeDate(snapshot.renderedAt) : null,
          status: snapshot.renderedAt ? "RENDERED" : "IN_PROGRESS",
          lastActiveAt: safeDate(snapshot.lastActiveAt),
          deletedAt: null,
        },
      });

      for (const step of snapshot.steps) {
        const data = {
          state: toStepState(step.state),
          provider: step.provider,
          data: jsonValue(step.data),
          payload: jsonValue(step.payload),
          schemaVersion: step.schemaVersion,
          apiCallCount: step.apiCallCount,
          generationCount: step.generationCount,
          ...(step.state === "approved" ? { approvedAt: safeDate(snapshot.lastActiveAt) } : {}),
        };
        await tx.videoSessionStep.upsert({
          where: {
            sessionId_step: { sessionId, step: toCreateStep(step.step) },
          },
          create: { sessionId, step: toCreateStep(step.step), ...data },
          update: data,
        });
      }

      if (snapshot.references.length) {
        await tx.videoSessionReference.deleteMany({
          where: {
            sessionId,
            referenceKey: { notIn: snapshot.references.map((item) => item.referenceKey) },
          },
        });
      } else {
        await tx.videoSessionReference.deleteMany({
          where: { sessionId },
        });
      }
      const storedReferences = await tx.videoSessionReference.findMany({
        where: {
          sessionId,
          referenceKey: { in: snapshot.references.map((item) => item.referenceKey) },
        },
        select: { referenceKey: true, url: true, metadata: true },
      });
      const storedReferencesByKey = new Map(
        storedReferences.map((reference) => [reference.referenceKey, reference]),
      );
      for (const reference of snapshot.references) {
        const stored = storedReferencesByKey.get(reference.referenceKey);
        const urlChanged = Boolean(stored && stored.url !== reference.url);
        const title = typeof reference.title === "string" ? reference.title : "";
        const metadata = urlChanged
          ? metadataWithReferenceTitle(stored?.metadata, "")
          : title.trim()
            ? metadataWithReferenceTitle(stored?.metadata, title)
            : null;
        await tx.videoSessionReference.upsert({
          where: {
            sessionId_referenceKey: {
              sessionId,
              referenceKey: reference.referenceKey,
            },
          },
          create: {
            sessionId,
            referenceKey: reference.referenceKey,
            order: reference.order,
            url: reference.url,
            videoId: reference.videoId,
            source: "manual",
            metadata: jsonValue(metadataWithReferenceTitle({}, title)),
            charCount: reference.charCount,
            wordCount: reference.wordCount,
          },
          update: {
            order: reference.order,
            url: reference.url,
            videoId: reference.videoId,
            removedAt: null,
            ...(metadata ? { metadata: jsonValue(metadata) } : {}),
            ...(urlChanged
              ? {
                  status: "EMPTY" as const,
                  source: "manual",
                  lang: null,
                  transcript: "",
                  segments: jsonValue([]),
                  charCount: 0,
                  wordCount: 0,
                  durationSec: null,
                  errorCode: null,
                  errorMessage: null,
                  fetchedAt: null,
                }
              : {}),
          },
        });
      }

      await tx.videoSessionScene.deleteMany({
        where: {
          sessionId,
          ...(snapshot.scenes.length
            ? { sceneKey: { notIn: snapshot.scenes.map((scene) => scene.sceneKey) } }
            : {}),
        },
      });
      for (const scene of snapshot.scenes) {
        await tx.videoSessionScene.upsert({
          where: { sessionId_sceneKey: { sessionId, sceneKey: scene.sceneKey } },
          create: { sessionId, ...scene },
          update: scene,
        });
      }

      if (snapshot.assets.length) {
        await tx.videoSessionAsset.updateMany({
          where: {
            sessionId,
            localClipId: { notIn: snapshot.assets.map((asset) => asset.localClipId) },
            removedAt: null,
          },
          data: { removedAt: new Date() },
        });
      } else {
        await tx.videoSessionAsset.updateMany({
          where: { sessionId, removedAt: null },
          data: { removedAt: new Date() },
        });
      }
      for (const asset of snapshot.assets) {
        await tx.videoSessionAsset.upsert({
          where: { sessionId_localClipId: { sessionId, localClipId: asset.localClipId } },
          create: {
            sessionId,
            ...asset,
            addedAtStep: toCreateStep(asset.addedAtStep),
          },
          update: {
            ...asset,
            addedAtStep: toCreateStep(asset.addedAtStep),
            removedAt: null,
          },
        });
      }

      await tx.videoSessionApiCall.createMany({
        data: snapshot.apiCalls.map((call) => ({
          sessionId,
          ...call,
          step: toCreateStep(call.step),
          at: safeDate(call.at),
        })),
        skipDuplicates: true,
      });
      for (const check of snapshot.checks) {
        await tx.videoSessionCheck.upsert({
          where: {
            sessionId_scope_sourceHash_provider: {
              sessionId,
              scope: check.scope,
              sourceHash: check.sourceHash,
              provider: check.provider,
            },
          },
          create: {
            sessionId,
            ...check,
            findings: jsonValue(check.findings),
            checkedAt: safeDate(check.checkedAt),
          },
          update: {
            verdict: check.verdict,
            score: check.score,
            summary: check.summary,
            findings: jsonValue(check.findings),
            checkedAt: safeDate(check.checkedAt),
          },
        });
      }
    }, { maxWait: 10_000, timeout: 20_000 }));

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "CHANNEL_NOT_FOUND") {
      return Response.json({ error: "Target channel not found." }, { status: 400 });
    }
    if (isDeletedVideoSessionError(error)) {
      return Response.json({ error: "Video was permanently deleted." }, { status: 410 });
    }
    console.error("[video-session] snapshot sync failed", error);
    return Response.json({ error: "Could not sync video session." }, { status: 500 });
  }
}
