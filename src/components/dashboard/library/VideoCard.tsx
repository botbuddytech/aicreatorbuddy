import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { libraryThumbUrl, type LibraryVideo, type VideoLibraryStatus } from "@/lib/contentLibrary";

const statusTone: Record<VideoLibraryStatus, BadgeTone> = {
  published: "success",
  scheduled: "blue",
  draft: "amber",
};

const statusLabel: Record<VideoLibraryStatus, string> = {
  published: "Published",
  scheduled: "Scheduled",
  draft: "Draft",
};

export function VideoCard({ video }: { video: LibraryVideo }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="group relative aspect-video overflow-hidden bg-surface-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={libraryThumbUrl(video.thumbLabel, video.id)}
          alt=""
          className="h-full w-full object-cover"
        />
        <Badge tone={statusTone[video.status]} size="sm" className="absolute top-3 left-3">
          {statusLabel[video.status]}
        </Badge>
        <span className="absolute right-3 bottom-3 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          {video.duration}
        </span>
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg">
            <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <h3 className="font-display line-clamp-2 text-base font-semibold text-foreground">{video.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <CalendarIcon />
              {video.publishedDate}
            </span>
            <span className="inline-flex items-center gap-1">
              <ClockIcon />
              {video.relativeTime}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat value={video.views} label="Views" />
          <Stat value={video.likes} label="Likes" />
          <Stat value={video.comments} label="Comments" />
          <Stat value={video.revenue} label="Revenue" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/dashboard/create"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-white/5"
          >
            <PencilIcon />
            Edit
          </Link>
          <Link
            href="/dashboard/analytics"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
          >
            <ChartIcon />
            Analytics
          </Link>
        </div>
      </div>
    </article>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}
