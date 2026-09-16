import { prisma } from "@/lib/db";
import { fromCreateStep } from "@/lib/session/server";

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
