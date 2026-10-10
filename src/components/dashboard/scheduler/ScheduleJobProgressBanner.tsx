"use client";

import Link from "next/link";
import { useScheduleJob } from "@/hooks/useScheduleJob";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function ScheduleJobProgressBanner() {
  const job = useScheduleJob();
  if (!job) return null;
  if (job.phase === "approved") {
    return null;
  }
  if (job.phase === "scheduled") {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm">
        <p className="font-semibold text-foreground">{job.title} is scheduled</p>
        <p className="mt-1 text-muted">Publish time: {formatWhen(job.publishAtIso)}</p>
        <Link href="/dashboard/videoscheduler" className="mt-2 inline-block text-sm font-semibold text-accent">
          View calendar
        </Link>
      </div>
    );
  }
  if (job.phase === "failed") {
    return (
      <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
        <p className="font-semibold text-foreground">Schedule failed</p>
        <p className="mt-1 text-muted">{job.error ?? job.message}</p>
      </div>
    );
  }

  const pct = Math.round(job.progress * 100);
  const phaseLabel =
    job.phase === "rendering"
      ? "Exporting video"
      : job.phase === "review"
        ? "Awaiting your approval"
        : job.phase === "uploading"
          ? "Uploading to YouTube"
          : "YouTube processing";

  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{job.title}</p>
          <p className="text-xs text-muted">{phaseLabel} · {job.message}</p>
        </div>
        <span className="text-sm font-semibold text-accent">{pct}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      {job.phase !== "review" ? (
        <p className="mt-2 text-xs text-muted">Scheduled for {formatWhen(job.publishAtIso)}</p>
      ) : null}
    </div>
  );
}
