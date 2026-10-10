import type { SchedulerStatCardData } from "@/lib/dashboardContent";
import type { ScheduleJob } from "@/lib/scheduler/scheduleJob";

function parseCount(value: string): number {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? 0 : n;
}

function bumpCard(cards: SchedulerStatCardData[], id: string, delta: number): SchedulerStatCardData[] {
  return cards.map((card) =>
    card.id === id ? { ...card, value: String(Math.max(0, parseCount(card.value) + delta)) } : card,
  );
}

/** Fold the in-tab schedule job into server stats (not yet on YouTube). */
export function mergeUpcomingStats(
  cards: SchedulerStatCardData[],
  job: ScheduleJob | null,
  nextUploadOffsetMs: number | null,
  readySessionIds: string[] = [],
): { cards: SchedulerStatCardData[]; nextUploadOffsetMs: number | null } {
  if (!job || job.phase === "failed" || job.phase === "review" || job.phase === "rendering") {
    return { cards, nextUploadOffsetMs };
  }

  let updated = cards;
  let next = nextUploadOffsetMs;

  const jobAlreadyInReadyCount = readySessionIds.includes(job.sessionId);

  if (job.phase === "approved" && !jobAlreadyInReadyCount) {
    updated = bumpCard(updated, "ready", 1);
  } else if (job.phase === "uploading" || job.phase === "processing") {
    updated = bumpCard(updated, "processing", 1);
  }

  return { cards: updated, nextUploadOffsetMs: next };
}
