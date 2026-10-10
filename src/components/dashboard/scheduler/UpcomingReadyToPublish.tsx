"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { useScheduleYouTubeUpload } from "@/hooks/useScheduleYouTubeUpload";
import type { ScheduleCandidate } from "@/lib/scheduler/candidates";
import { scheduleCandidateLabel } from "@/lib/scheduler/candidateLabel";
import { useScheduleJob } from "@/hooks/useScheduleJob";
import { pickUploadChannelId } from "@/lib/scheduler/pickUploadChannel";
import type { ScheduleApprovedMeta } from "@/lib/scheduler/scheduleApprovedMeta";

function ReadyThumb({ title, url }: { title: string; url: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <span
        title={title}
        className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg bg-surface-soft text-[10px] font-semibold text-muted"
      >
        No image
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="h-12 w-20 shrink-0 rounded-lg object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function scheduleResumeHref(sessionId: string, publishAtIso?: string): string {
  const params = new URLSearchParams({ sessionId });
  if (publishAtIso) params.set("publishAt", publishAtIso);
  return `/dashboard/videoscheduler/schedule?${params.toString()}`;
}

function metaAsCandidate(meta: ScheduleApprovedMeta): ScheduleCandidate {
  return {
    id: meta.sessionId,
    name: meta.title,
    topic: "",
    channelId: meta.channelId,
    channelTitle: null,
    exportSuccessCount: 0,
    renderedAt: null,
    firstExportedAt: null,
    lastActiveAt: meta.approvedAt,
    status: "DRAFT",
    readyToSchedule: false,
  };
}

export function UpcomingReadyToPublish({
  projects,
  approvedMetas,
  channels,
  activeChannelId,
}: {
  projects: ScheduleCandidate[];
  approvedMetas: ScheduleApprovedMeta[];
  channels: { id: string; title: string; status: string }[];
  activeChannelId: string | null;
}) {
  const job = useScheduleJob();
  const { busy, error, canUploadSession, upload } = useScheduleYouTubeUpload({ channels, activeChannelId });

  const mergedProjects = useMemo(() => {
    const byId = new Map(projects.map((p) => [p.id, p]));
    for (const meta of approvedMetas) {
      if (!byId.has(meta.sessionId)) byId.set(meta.sessionId, metaAsCandidate(meta));
    }
    return Array.from(byId.values());
  }, [projects, approvedMetas]);

  if (mergedProjects.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h3 className="font-display text-base font-semibold text-foreground">Ready to publish</h3>
      <p className="mt-1 text-xs text-muted">
        Survives refresh: projects with an export in the app and/or an approval you saved. Upload needs the MP4 in
        this tab — if you refreshed, use <strong>Finish upload</strong> to re-export once (same publish time).
      </p>
      {error ? <p className="mt-2 text-sm text-accent">{error}</p> : null}
      <ul className="mt-4 divide-y divide-border">
        {mergedProjects.map((project) => {
          const title = project.publishTitle?.trim() || meta?.title?.trim() || scheduleCandidateLabel(project);
          const thumbnailUrl = project.thumbnailUrl || meta?.thumbnailUrl || null;
          const meta = approvedMetas.find((m) => m.sessionId === project.id);
          const canUpload = canUploadSession(project.id);
          const awaitingThis = job?.sessionId === project.id && job.phase === "approved" && canUpload;
          const publishLabel = meta
            ? new Date(meta.publishAtIso).toLocaleString()
            : "No publish time yet";
          return (
            <li key={project.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <ReadyThumb title={title} url={thumbnailUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted">
                  {channels.find(
                    (channel) =>
                      channel.id ===
                      pickUploadChannelId({
                        selectedChannelId: meta?.channelId || project.channelId,
                        activeChannelId,
                        channels,
                      }),
                  )?.title ?? "Connected channel"}
                  {" · "}
                  {awaitingThis
                    ? `Publish ${publishLabel} — MP4 ready in this tab`
                    : meta
                      ? `Approved for ${publishLabel}${project.exportSuccessCount > 0 ? "" : " · re-export to upload"}`
                      : `${project.exportSuccessCount} export${project.exportSuccessCount === 1 ? "" : "s"} in app`}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {canUpload ? (
                  <ActionButton
                    type="button"
                    size="sm"
                    loading={busy && awaitingThis}
                    loadingLabel="Uploading…"
                    onClick={() => void upload()}
                  >
                    Upload to YouTube
                  </ActionButton>
                ) : (
                  <Link
                    href={scheduleResumeHref(project.id, meta?.publishAtIso)}
                    className="inline-flex rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-dark"
                  >
                    Finish upload
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
