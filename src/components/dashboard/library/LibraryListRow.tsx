import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import {
  libraryThumbUrl,
  type LibraryPlaylist,
  type LibraryVideo,
  type VideoLibraryStatus,
} from "@/lib/contentLibrary";

const videoStatusTone: Record<VideoLibraryStatus, BadgeTone> = {
  published: "success",
  scheduled: "blue",
  draft: "amber",
};

const videoStatusLabel: Record<VideoLibraryStatus, string> = {
  published: "Published",
  scheduled: "Scheduled",
  draft: "Draft",
};

export function VideoListRow({ video }: { video: LibraryVideo }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 sm:flex-row sm:items-center">
      <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-xl sm:w-36">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={libraryThumbUrl(video.thumbLabel, video.id)}
          alt=""
          className="h-full w-full object-cover"
        />
        <span className="absolute right-1.5 bottom-1.5 rounded bg-black/70 px-1 text-[10px] font-semibold text-white">
          {video.duration}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display truncate text-sm font-semibold text-foreground">{video.title}</h3>
          <Badge tone={videoStatusTone[video.status]} size="sm">
            {videoStatusLabel[video.status]}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted">
          {video.channelName} · {video.publishedDate} · {video.views} views
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/dashboard/create"
          className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-white/5"
        >
          Edit
        </Link>
        <Link
          href="/dashboard/analytics"
          className="rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-dark"
        >
          Analytics
        </Link>
      </div>
    </article>
  );
}

export function PlaylistListRow({
  playlist,
  onDelete,
}: {
  playlist: LibraryPlaylist;
  onDelete: () => void;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 sm:flex-row sm:items-center">
      <div className="grid h-20 w-full shrink-0 grid-cols-2 gap-0.5 overflow-hidden rounded-xl sm:w-36">
        {playlist.thumbLabels.map((label, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${playlist.id}-row-${index}`}
            src={libraryThumbUrl(label, `${playlist.id}-${index}`)}
            alt=""
            className="h-full w-full object-cover"
          />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display truncate text-sm font-semibold text-foreground">{playlist.title}</h3>
          <Badge tone={playlist.visibility === "public" ? "success" : "muted"} size="sm">
            {playlist.visibility === "public" ? "Public" : "Private"}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted">
          {playlist.videoCount} videos · {playlist.views} · {playlist.updatedLabel}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label={`Edit ${playlist.title}`}
          className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-white/5"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-dark"
        >
          Delete
        </button>
      </div>
    </article>
  );
}
