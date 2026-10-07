import "server-only";

import { prisma } from "@/lib/db";
import {
  periodStart,
  rangeLabel,
  type ExportDurationRange,
  type ExportDurationSummary,
} from "@/lib/dashboard/exportDuration";

export async function exportDurationSummary(
  userId: string,
  range: ExportDurationRange,
  timeZone: string,
  now = new Date(),
): Promise<ExportDurationSummary> {
  const start = periodStart(range, timeZone, now);
  const grouped = await prisma.videoSessionExport.groupBy({
    by: ["sessionId"],
    where: {
      status: "SUCCEEDED",
      finishedAt: { gte: start, lte: now },
      runtimeSec: { gt: 0 },
      session: { userId, deletedAt: null },
    },
    _max: { runtimeSec: true },
  });
  const totalSeconds = grouped.reduce((sum, row) => sum + (row._max.runtimeSec ?? 0), 0);
  return {
    range,
    totalSeconds,
    videoCount: grouped.length,
    label: rangeLabel(range),
  };
}
