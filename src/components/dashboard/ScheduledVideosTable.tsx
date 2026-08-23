import Link from "next/link";
import type { ReactNode } from "react";
import { PlaceholderImage } from "@/components/create/PlaceholderImage";
import { scheduledVideos, type ScheduledVideo } from "@/lib/dashboardContent";

const statusClass: Record<ScheduledVideo["status"], string> = {
  scheduled: "bg-chart-blue/15 text-chart-blue",
  processing: "bg-chart-amber/15 text-chart-amber",
};

const scoreClass: Record<ScheduledVideo["aiLabel"], string> = {
  Excellent: "bg-[#2dd4bf]/15 text-[#2dd4bf]",
  Good: "bg-success/15 text-success",
};

function IconButton({
  label,
  href,
  tone = "muted",
  children,
}: {
  label: string;
  href?: string;
  tone?: "muted" | "danger";
  children: ReactNode;
}) {
  const className = `inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors ${
    tone === "danger" ? "text-accent hover:bg-accent/10" : "text-muted hover:bg-white/5 hover:text-foreground"
  }`;

  if (href) {
    return (
      <Link href={href} aria-label={label} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={label} className={className}>
      {children}
    </button>
  );
}

export function ScheduledVideosTable() {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Upcoming scheduled</h3>
          <p className="mt-1 text-sm text-muted">Next publishes queued across the workspace</p>
        </div>
        <Link
          href="/dashboard/create"
          className="inline-flex items-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
        >
          + Schedule new
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
              <th className="pb-3 font-medium">Video</th>
              <th className="pb-3 font-medium">Scheduled</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">AI score</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {scheduledVideos.map((video) => (
              <tr key={video.id} className="border-b border-border/60 odd:bg-white/[0.02] last:border-0">
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <PlaceholderImage
                      label={video.title}
                      className="h-12 w-[4.5rem] shrink-0 rounded-lg"
                    />
                    <div>
                      <p className="font-medium text-foreground">{video.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{video.duration}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3">
                  <p className="text-foreground">{video.date}</p>
                  <p className="mt-0.5 text-xs text-muted">{video.time}</p>
                </td>
                <td className="py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusClass[video.status]}`}
                  >
                    {video.status}
                  </span>
                </td>
                <td className="py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${scoreClass[video.aiLabel]}`}
                  >
                    {video.aiScore} {video.aiLabel}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1.5">
                    <IconButton label={`Edit ${video.title}`} href="/dashboard/create">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </IconButton>
                    <IconButton label={`Preview ${video.title}`}>
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </IconButton>
                    <IconButton label={`Delete ${video.title}`} tone="danger">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4h8v2m-1 0v14H9V6" />
                      </svg>
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
