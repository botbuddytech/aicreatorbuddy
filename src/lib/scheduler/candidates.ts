import { prisma } from "@/lib/db";
import { selectedPublishTitle, selectedThumbnailUrl } from "@/lib/scheduler/readyPresentation";

export type ScheduleCandidate = {
  id: string;
  name: string;
  topic: string;
  channelId: string | null;
  channelTitle: string | null;
  exportSuccessCount: number;
  renderedAt: string | null;
  firstExportedAt: string | null;
  lastActiveAt: string;
  status: string;
  readyToSchedule: boolean;
  /** Selected YouTube title, when the title step has one. */
  publishTitle?: string | null;
  thumbnailUrl?: string | null;
};

function channelSortRank(channelId: string | null, activeChannelId: string | null): number {
  if (!activeChannelId) return 0;
  if (channelId === activeChannelId) return 0;
  if (channelId === null) return 1;
  return 2;
}

export async function listScheduleCandidates(
  userId: string,
  activeChannelId: string | null,
): Promise<ScheduleCandidate[]> {
  const rows = await prisma.videoSession.findMany({
    where: {
      userId,
      deletedAt: null,
      youtubeVideoId: null,
    },
    orderBy: [{ exportSuccessCount: "desc" }, { lastActiveAt: "desc" }],
    select: {
      id: true,
      name: true,
      topic: true,
      channelId: true,
      channelTitle: true,
      exportSuccessCount: true,
      renderedAt: true,
      firstExportedAt: true,
      lastActiveAt: true,
      status: true,
    },
  });

  const mapped: ScheduleCandidate[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    topic: row.topic,
    channelId: row.channelId,
    channelTitle: row.channelTitle,
    exportSuccessCount: row.exportSuccessCount,
    renderedAt: row.renderedAt?.toISOString() ?? null,
    firstExportedAt: row.firstExportedAt?.toISOString() ?? null,
    lastActiveAt: row.lastActiveAt.toISOString(),
    status: row.status,
    readyToSchedule: row.exportSuccessCount > 0,
  }));

  if (!activeChannelId) return mapped;

  return [...mapped].sort((a, b) => {
    const rankDiff =
      channelSortRank(a.channelId, activeChannelId) - channelSortRank(b.channelId, activeChannelId);
    if (rankDiff !== 0) return rankDiff;
    if (b.exportSuccessCount !== a.exportSuccessCount) return b.exportSuccessCount - a.exportSuccessCount;
    return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
  });
}

export async function listReadyToPublish(
  userId: string,
  activeChannelId: string | null,
): Promise<ScheduleCandidate[]> {
  const all = await listScheduleCandidates(userId, activeChannelId);
  const ready = all.filter((row) => row.readyToSchedule);
  if (ready.length === 0) return ready;

  const steps = await prisma.videoSessionStep.findMany({
    where: { sessionId: { in: ready.map((row) => row.id) }, step: { in: ["TITLE", "THUMBNAIL"] } },
    select: { sessionId: true, step: true, data: true, payload: true },
  });
  const bySession = new Map<string, { title: string | null; thumbnailUrl: string | null }>();
  for (const row of ready) bySession.set(row.id, { title: null, thumbnailUrl: null });
  for (const step of steps) {
    const current = bySession.get(step.sessionId);
    if (!current) continue;
    if (step.step === "TITLE") current.title = selectedPublishTitle(step.data, step.payload);
    if (step.step === "THUMBNAIL") current.thumbnailUrl = selectedThumbnailUrl(step.payload);
  }

  return ready.map((row) => {
    const presentation = bySession.get(row.id);
    return {
      ...row,
      publishTitle: presentation?.title ?? null,
      thumbnailUrl: presentation?.thumbnailUrl ?? null,
    };
  });
}

export async function countReadyToPublish(userId: string, activeChannelId: string | null): Promise<number> {
  const scoped = await prisma.videoSession.count({
    where: {
      userId,
      deletedAt: null,
      youtubeVideoId: null,
      exportSuccessCount: { gt: 0 },
      ...(activeChannelId ? { channelId: activeChannelId } : {}),
    },
  });
  if (scoped > 0 || !activeChannelId) return scoped;
  return prisma.videoSession.count({
    where: {
      userId,
      deletedAt: null,
      youtubeVideoId: null,
      exportSuccessCount: { gt: 0 },
    },
  });
}
