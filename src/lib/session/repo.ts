import { prisma } from "@/lib/db";
import { fromCreateStep, fromStepState } from "@/lib/session/server";
import type { SessionDocuments } from "@/lib/session/stepPayload";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function listSessions(userId: string) {
  const rows = await prisma.videoSession.findMany({
    where: { userId, deletedAt: null },
    orderBy: { lastActiveAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      currentStep: true,
      channelId: true,
      channelTitle: true,
      topic: true,
      format: true,
      aspectRatio: true,
      sceneCount: true,
      approvedStepCount: true,
      apiCallCount: true,
      exportSuccessCount: true,
      estimatedCostUsd: true,
      createdAt: true,
      lastActiveAt: true,
    },
  });
  return rows.map((row) => ({
    ...row,
    currentStep: fromCreateStep(row.currentStep),
    estimatedCostUsd: Number(row.estimatedCostUsd),
    createdAt: row.createdAt.toISOString(),
    lastActiveAt: row.lastActiveAt.toISOString(),
  }));
}

export async function getSessionOverview(id: string, userId: string) {
  const row = await prisma.videoSession.findFirst({
    where: { id, userId },
    include: {
      steps: { orderBy: { step: "asc" } },
      assets: { where: { removedAt: null }, orderBy: { addedAt: "asc" } },
      exports: { orderBy: { startedAt: "desc" } },
      apiCalls: { orderBy: { at: "desc" }, take: 100 },
      events: { orderBy: { at: "desc" }, take: 100 },
    },
  });
  if (!row) return null;
  return {
    ...row,
    currentStep: fromCreateStep(row.currentStep),
    estimatedCostUsd: Number(row.estimatedCostUsd),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastActiveAt: row.lastActiveAt.toISOString(),
    renderedAt: row.renderedAt?.toISOString() ?? null,
    firstExportedAt: row.firstExportedAt?.toISOString() ?? null,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    steps: row.steps.map((step) => ({
      ...step,
      step: fromCreateStep(step.step),
      updatedAt: step.updatedAt.toISOString(),
      enteredAt: step.enteredAt?.toISOString() ?? null,
      firstGeneratedAt: step.firstGeneratedAt?.toISOString() ?? null,
      approvedAt: step.approvedAt?.toISOString() ?? null,
    })),
    assets: row.assets.map((asset) => ({
      ...asset,
      addedAtStep: fromCreateStep(asset.addedAtStep),
      addedAt: asset.addedAt.toISOString(),
      removedAt: asset.removedAt?.toISOString() ?? null,
    })),
    exports: row.exports.map((item) => ({
      ...item,
      startedAt: item.startedAt.toISOString(),
      finishedAt: item.finishedAt?.toISOString() ?? null,
    })),
    apiCalls: row.apiCalls.map((call) => ({
      ...call,
      step: fromCreateStep(call.step),
      estimatedUsd: Number(call.estimatedUsd),
      at: call.at.toISOString(),
    })),
    events: row.events.map((item) => ({
      ...item,
      step: item.step ? fromCreateStep(item.step) : null,
      at: item.at.toISOString(),
    })),
  };
}

export async function getSessionTimeline(id: string, userId: string) {
  const owned = await prisma.videoSession.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!owned) return null;
  const events = await prisma.videoSessionEvent.findMany({
    where: { sessionId: id },
    orderBy: [{ sequence: "asc" }, { at: "asc" }],
  });
  return events.map((item) => ({
    ...item,
    step: item.step ? fromCreateStep(item.step) : null,
    at: item.at.toISOString(),
  }));
}

/** One query: every step payload + references for cross-device resume. */
export async function getSessionDocuments(
  id: string,
  userId: string,
): Promise<SessionDocuments | null> {
  const row = await prisma.videoSession.findFirst({
    where: { id, userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastActiveAt: true,
      exportSuccessCount: true,
      steps: {
        orderBy: { step: "asc" },
        select: {
          step: true,
          state: true,
          provider: true,
          schemaVersion: true,
          payload: true,
        },
      },
      references: {
        where: { removedAt: null },
        orderBy: { order: "asc" },
        select: {
          referenceKey: true,
          order: true,
          url: true,
          videoId: true,
          status: true,
          source: true,
          lang: true,
          transcript: true,
          charCount: true,
          wordCount: true,
          durationSec: true,
          fetchedAt: true,
          metadata: true,
        },
      },
      apiCalls: {
        orderBy: { at: "asc" },
        select: {
          clientCallId: true,
          step: true,
          tool: true,
          kind: true,
          estimatedUsd: true,
          at: true,
        },
      },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    lastActiveAt: row.lastActiveAt.toISOString(),
    exportSuccessCount: row.exportSuccessCount,
    steps: row.steps.map((step) => ({
      step: fromCreateStep(step.step),
      state: fromStepState(step.state),
      provider: step.provider,
      schemaVersion: step.schemaVersion,
      payload: asRecord(step.payload),
    })),
    references: row.references.map((reference) => ({
      referenceKey: reference.referenceKey,
      order: reference.order,
      url: reference.url,
      videoId: reference.videoId,
      status: reference.status,
      source: reference.source,
      lang: reference.lang,
      transcript: reference.transcript,
      charCount: reference.charCount,
      wordCount: reference.wordCount,
      durationSec: reference.durationSec,
      fetchedAt: reference.fetchedAt?.toISOString() ?? null,
      metadata: asRecord(reference.metadata),
    })),
    apiCalls: row.apiCalls.map((call) => ({
      clientCallId: call.clientCallId,
      step: fromCreateStep(call.step),
      tool: call.tool,
      kind: call.kind,
      estimatedUsd: Number(call.estimatedUsd),
      at: call.at.toISOString(),
    })),
  };
}
