import { pickUploadChannelId, type UploadChannelRef } from "@/lib/scheduler/pickUploadChannel";
import { clearApprovedMeta } from "@/lib/scheduler/scheduleApprovedMeta";
import { clearPendingScheduleUpload, getPendingScheduleUpload } from "@/lib/scheduler/schedulePendingUpload";
import { patchScheduleJob, writeScheduleJob, type ScheduleJob } from "@/lib/scheduler/scheduleJob";
import { publishVideoToYoutube } from "@/lib/youtube/publishClient";
import type { VideoProject } from "@/lib/videoProject";

function minimalProject(sessionId: string, channelId: string): VideoProject {
  return { id: sessionId, channelId } as VideoProject;
}

export async function runScheduleUpload(
  job: ScheduleJob,
  channels: { channels: UploadChannelRef[]; activeChannelId: string | null } = {
    channels: [],
    activeChannelId: null,
  },
): Promise<{ videoId: string }> {
  const pending = getPendingScheduleUpload(job.sessionId);
  if (!pending) {
    throw new Error("Export not found in this tab. Open Video Scheduler, export again, and approve in the same tab.");
  }
  const channelId = pickUploadChannelId({
    selectedChannelId: pending.channelId || job.channelId,
    activeChannelId: channels.activeChannelId,
    channels: channels.channels,
  });
  if (!channelId) throw new Error("Connect a YouTube channel before uploading.");

  patchScheduleJob({
    phase: "uploading",
    progress: 0.1,
    message: "Starting YouTube upload…",
  });

  const project = minimalProject(pending.sessionId, channelId);
  const result = await publishVideoToYoutube({
    project,
    file: pending.file,
    channelId,
    title: pending.title,
    description: pending.description,
    tags: pending.tags,
    privacy: "private",
    publishAtIso: pending.publishAtIso,
    thumbnailUrl: pending.thumbnailUrl,
    onPhase: (phase) => {
      const progress = phase === "starting" ? 0.15 : phase === "uploading" ? 0.2 : 0.92;
      const message =
        phase === "starting"
          ? "Starting upload…"
          : phase === "uploading"
            ? "Sending video file…"
            : "Finishing on YouTube…";
      patchScheduleJob({ phase: "uploading", progress, message });
    },
    onUploadProgress: (ratio) => {
      patchScheduleJob({
        phase: "uploading",
        progress: 0.2 + ratio * 0.7,
        message: `Uploading ${Math.round(ratio * 100)}%…`,
      });
    },
  });

  clearPendingScheduleUpload(pending.sessionId);
  clearApprovedMeta(pending.sessionId);
  writeScheduleJob({
    sessionId: pending.sessionId,
    title: pending.title,
    publishAtIso: pending.publishAtIso,
    channelId,
    phase: "scheduled",
    progress: 1,
    message: "Scheduled on YouTube",
    videoId: result.videoId,
    updatedAt: new Date().toISOString(),
  });

  return { videoId: result.videoId };
}
