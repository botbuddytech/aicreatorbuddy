"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Modal } from "@/components/ui/Modal";
import type { VideoProject } from "@/lib/videoProject";
import { projectPublishTitle, projectThumbnailUrl } from "@/lib/youtube/publishClient";

function formatPublishLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ScheduleApprovalModal({
  open,
  project,
  publishAtIso,
  channelTitle,
  videoUrl,
  fileName,
  busy,
  error,
  onClose,
  onApprove,
}: {
  open: boolean;
  project: VideoProject;
  publishAtIso: string;
  channelTitle: string;
  videoUrl: string;
  fileName: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onApprove: () => void;
}) {
  const title = projectPublishTitle(project);
  const thumb = projectThumbnailUrl(project);
  const [thumbOk, setThumbOk] = useState(true);

  useEffect(() => {
    setThumbOk(true);
  }, [thumb]);

  const tagsLine = useMemo(() => project.tags.filter(Boolean).join(", "), [project.tags]);

  return (
    <Modal
      open={open}
      title="Review & schedule"
      subtitle={`Goes live ${formatPublishLabel(publishAtIso)} · YouTube upload happens on Upcoming after you approve`}
      onClose={busy ? () => {} : onClose}
      size="xl"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <video
            src={videoUrl}
            controls
            playsInline
            className="aspect-video w-full rounded-xl border border-border bg-black object-contain"
          />
          <p className="text-xs text-muted">{fileName}</p>
        </div>
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Title</p>
            <p className="mt-1 font-semibold text-foreground">{title}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Thumbnail</p>
            <div className="mt-2 aspect-video max-w-[240px] overflow-hidden rounded-lg border border-border bg-surface-soft">
              {thumb && thumbOk ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" className="h-full w-full object-cover" onError={() => setThumbOk(false)} />
              ) : (
                <div className="flex h-full items-center justify-center px-3 text-center text-xs text-muted">
                  No thumbnail selected
                </div>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Description</p>
            <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap text-muted">
              {project.description.trim() || "—"}
            </p>
          </div>
          {tagsLine ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Tags</p>
              <p className="mt-1 text-muted">{tagsLine}</p>
            </div>
          ) : null}
          <div className="rounded-xl border border-border bg-surface-soft px-3 py-2">
            <p className="text-xs text-muted">YouTube channel</p>
            <p className="text-sm font-semibold text-foreground">{channelTitle}</p>
            <p className="mt-2 text-xs text-muted">Scheduled publish</p>
            <p className="text-sm font-semibold text-foreground">{formatPublishLabel(publishAtIso)}</p>
          </div>
        </div>
      </div>
      {error ? <p className="mt-4 text-sm text-accent">{error}</p> : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <ActionButton type="button" loading={busy} loadingLabel="Saving…" onClick={onApprove}>
          Approve &amp; continue
        </ActionButton>
        <ActionButton type="button" variant="secondary" disabled={busy} onClick={onClose}>
          Cancel
        </ActionButton>
      </div>
    </Modal>
  );
}
