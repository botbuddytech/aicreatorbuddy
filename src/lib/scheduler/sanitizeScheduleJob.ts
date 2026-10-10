import { getPendingScheduleUpload } from "@/lib/scheduler/schedulePendingUpload";
import { readScheduleJob, writeScheduleJob } from "@/lib/scheduler/scheduleJob";

/** Drop stale wizard state; recover interrupted uploads when the MP4 is still in memory. */
export function sanitizeScheduleJobForUpcoming(liveScheduledVideoIds?: string[]) {
  const job = readScheduleJob();
  if (!job) return;

  if (
    job.phase === "scheduled" &&
    liveScheduledVideoIds &&
    (!job.videoId || !liveScheduledVideoIds.includes(job.videoId))
  ) {
    writeScheduleJob(null);
    return;
  }

  if (job.phase === "review") {
    writeScheduleJob(null);
    return;
  }

  const pending = getPendingScheduleUpload(job.sessionId);
  if (job.phase === "uploading" || job.phase === "processing") {
    if (!pending) {
      writeScheduleJob({
        ...job,
        phase: "approved",
        progress: 0,
        message: "Ready to upload",
        error: undefined,
        updatedAt: new Date().toISOString(),
      });
    }
    return;
  }

  if (job.phase === "approved" && !pending) {
    writeScheduleJob({
      ...job,
      progress: 0,
      message: "Video file cleared — use Finish upload below (re-export in this tab)",
      updatedAt: new Date().toISOString(),
    });
  }
}
