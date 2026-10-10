"use client";

import { ActionButton } from "@/components/ui/ActionButton";
import { useScheduleYouTubeUpload } from "@/hooks/useScheduleYouTubeUpload";
import { pickUploadChannelId } from "@/lib/scheduler/pickUploadChannel";
import { getPendingScheduleUpload } from "@/lib/scheduler/schedulePendingUpload";

function channelLabel(
  channelId: string | undefined,
  channels: { id: string; title: string; status: string }[],
  activeChannelId: string | null,
): string {
  const id = pickUploadChannelId({
    selectedChannelId: channelId,
    activeChannelId,
    channels,
  });
  return channels.find((channel) => channel.id === id)?.title ?? "your connected channel";
}

/** Shown when the latest approved job is waiting for upload (same as row action in Ready to publish). */
export function UpcomingScheduleUpload({
  channels,
  activeChannelId,
}: {
  channels: { id: string; title: string; status: string }[];
  activeChannelId: string | null;
}) {
  const { job, busy, error, upload } = useScheduleYouTubeUpload({ channels, activeChannelId });

  if (!job || job.phase !== "approved") return null;

  const pending = getPendingScheduleUpload(job.sessionId);
  if (!pending) {
    return (
      <div className="rounded-xl border border-chart-amber/40 bg-chart-amber/10 px-4 py-3 text-sm">
        <p className="font-semibold text-foreground">Export not found in this tab</p>
        <p className="mt-1 text-muted">
          Use <strong>Set time &amp; export</strong> on your project below, or complete Video Scheduler in this tab and
          approve — then upload here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-4 text-sm">
      <p className="font-semibold text-foreground">Approved: {job.title}</p>
      <p className="mt-1 text-muted">
        Channel: {channelLabel(pending.channelId || job.channelId, channels, activeChannelId)}
      </p>
      <p className="mt-1 text-muted">Publish time: {new Date(job.publishAtIso).toLocaleString()}</p>
      {error ? <p className="mt-2 text-accent">{error}</p> : null}
      <ActionButton
        type="button"
        className="mt-3"
        loading={busy}
        loadingLabel="Uploading to YouTube…"
        onClick={() => void upload()}
      >
        Upload to YouTube
      </ActionButton>
    </div>
  );
}
