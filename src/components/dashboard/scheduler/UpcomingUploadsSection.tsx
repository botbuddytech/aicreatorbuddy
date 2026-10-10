"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useRouter } from "nextjs-toploader/app";
import { NextUpCountdown } from "@/components/dashboard/scheduler/NextUpCountdown";
import { ScheduleJobProgressBanner } from "@/components/dashboard/scheduler/ScheduleJobProgressBanner";
import { SchedulerStatCard } from "@/components/dashboard/scheduler/SchedulerStatCard";
import { UpcomingReadyToPublish } from "@/components/dashboard/scheduler/UpcomingReadyToPublish";
import { UpcomingScheduleUpload } from "@/components/dashboard/scheduler/UpcomingScheduleUpload";
import { UpcomingUploadsBoard } from "@/components/dashboard/scheduler/UpcomingUploadsBoard";
import { useScheduleJob } from "@/hooks/useScheduleJob";
import type { SchedulerStatCardData, UpcomingUpload } from "@/lib/dashboardContent";
import type { ScheduleCandidate } from "@/lib/scheduler/candidates";
import { scheduleCandidateLabel } from "@/lib/scheduler/candidateLabel";
import { useApprovedScheduleMetas } from "@/hooks/useApprovedScheduleMetas";
import { sanitizeScheduleJobForUpcoming } from "@/lib/scheduler/sanitizeScheduleJob";
import { mergeUpcomingStats } from "@/lib/scheduler/upcomingStats";

export function UpcomingUploadsSection({
  upcomingCards,
  nextUploadOffsetMs,
  uploads,
  scheduledVideoIds,
  readyProjects,
  channels,
  activeChannelId,
}: {
  upcomingCards: SchedulerStatCardData[];
  nextUploadOffsetMs: number | null;
  uploads: UpcomingUpload[];
  scheduledVideoIds: string[];
  readyProjects: ScheduleCandidate[];
  channels: { id: string; title: string; status: string }[];
  activeChannelId: string | null;
}) {
  const router = useRouter();
  const job = useScheduleJob();
  const approvedMetas = useApprovedScheduleMetas();
  const readySessionIds = useMemo(() => {
    const ids = new Set(readyProjects.map((p) => p.id));
    for (const meta of approvedMetas) ids.add(meta.sessionId);
    return Array.from(ids);
  }, [readyProjects, approvedMetas]);

  useLayoutEffect(() => {
    sanitizeScheduleJobForUpcoming(scheduledVideoIds);
  }, [scheduledVideoIds]);

  const refreshedScheduledRef = useRef(false);
  useEffect(() => {
    if (job?.phase === "scheduled" && !refreshedScheduledRef.current) {
      refreshedScheduledRef.current = true;
      router.refresh();
    }
  }, [job?.phase, router]);

  const { cards, nextUploadOffsetMs: nextOffset } = useMemo(
    () => mergeUpcomingStats(upcomingCards, job, nextUploadOffsetMs, readySessionIds),
    [upcomingCards, job, nextUploadOffsetMs, readySessionIds],
  );

  const merged = useMemo(() => {
    const byId = new Map<string, UpcomingUpload>();
    for (const item of uploads) byId.set(item.id, item);

    for (const project of readyProjects) {
      if (byId.has(project.id)) continue;
      const meta = approvedMetas.find((item) => item.sessionId === project.id);
      byId.set(project.id, {
        id: project.id,
        title: project.publishTitle?.trim() || meta?.title?.trim() || scheduleCandidateLabel(project),
        duration: "—",
        status: "ready",
        scheduledLabel: meta
          ? `Approved · ${new Date(meta.publishAtIso).toLocaleString()}`
          : "Exported in app — not on YouTube",
        thumbnailUrl: project.thumbnailUrl || meta?.thumbnailUrl || null,
        sessionId: project.id,
      });
    }
    for (const meta of approvedMetas) {
      if (byId.has(meta.sessionId)) continue;
      byId.set(meta.sessionId, {
        id: meta.sessionId,
        title: meta.title,
        duration: "—",
        status: "ready",
        scheduledLabel: `Approved · ${new Date(meta.publishAtIso).toLocaleString()}`,
        thumbnailUrl: meta.thumbnailUrl,
        sessionId: meta.sessionId,
      });
    }

    if (job && job.phase !== "scheduled" && job.phase !== "failed" && job.phase !== "review") {
      const status =
        job.phase === "processing" || job.phase === "uploading"
          ? "processing"
          : job.phase === "approved" || job.phase === "rendering"
            ? "ready"
            : "scheduled";
      const scheduledLabel =
        job.phase === "approved" || job.phase === "uploading" || job.phase === "processing"
          ? new Date(job.publishAtIso).toLocaleString()
          : scheduleCandidateLabel(
              readyProjects.find((p) => p.id === job.sessionId) ?? { name: job.title, topic: "" },
            );
      const existing = byId.get(job.sessionId);
      byId.set(job.sessionId, {
        id: job.sessionId,
        title: existing?.title ?? job.title,
        duration: existing?.duration ?? "—",
        status,
        scheduledLabel: existing?.scheduledLabel ?? scheduledLabel,
        thumbnailUrl: existing?.thumbnailUrl ?? null,
        sessionId: job.sessionId,
        youtubeUrl: existing?.youtubeUrl ?? null,
      });
    }

    return Array.from(byId.values());
  }, [approvedMetas, job, readyProjects, uploads]);

  const showProgressBanner =
    job != null &&
    job.phase !== "scheduled" &&
    job.phase !== "approved" &&
    job.phase !== "review" &&
    job.phase !== "failed";

  const liveProgress =
    job?.phase === "uploading" || job?.phase === "processing" ? job.progress : undefined;

  const liveJobId =
    job && job.phase !== "scheduled" && job.phase !== "review" && job.phase !== "approved"
      ? job.sessionId
      : null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <SchedulerStatCard
            key={card.id}
            icon={card.icon}
            label={card.label}
            value={
              card.id === "next-up" && nextOffset != null ? (
                <NextUpCountdown offsetMs={nextOffset} />
              ) : card.id === "next-up" ? (
                "—"
              ) : (
                card.value
              )
            }
            badge={card.badge}
            sub={card.sub}
          />
        ))}
      </div>
      <div className="space-y-4">
        <UpcomingScheduleUpload channels={channels} activeChannelId={activeChannelId} />
        <UpcomingReadyToPublish
          projects={readyProjects}
          approvedMetas={approvedMetas}
          channels={channels}
          activeChannelId={activeChannelId}
        />
        {showProgressBanner ? <ScheduleJobProgressBanner /> : null}
        <UpcomingUploadsBoard uploads={merged} liveJobId={liveJobId} liveProgress={liveProgress} />
      </div>
    </>
  );
}
