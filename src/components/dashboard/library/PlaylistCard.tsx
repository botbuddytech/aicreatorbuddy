import { Badge } from "@/components/ui/Badge";
import { libraryThumbUrl, type LibraryPlaylist } from "@/lib/contentLibrary";

export function PlaylistCard({
  playlist,
  onDelete,
}: {
  playlist: LibraryPlaylist;
  onDelete: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="relative aspect-video overflow-hidden bg-surface-soft">
        <div className="grid h-full grid-cols-2 grid-rows-2 gap-0.5">
          {playlist.thumbLabels.map((label, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${playlist.id}-${label}-${index}`}
              src={libraryThumbUrl(label, `${playlist.id}-${index}`)}
              alt=""
              className="h-full w-full object-cover"
            />
          ))}
        </div>
        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          {playlist.videoCount} videos
        </span>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="font-display line-clamp-2 text-base font-semibold text-foreground">{playlist.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{playlist.description}</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {playlist.views}
            </span>
            <span className="inline-flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              {playlist.watchTime}
            </span>
          </div>
          <Badge tone={playlist.visibility === "public" ? "success" : "muted"} size="sm">
            {playlist.visibility === "public" ? "Public" : "Private"}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-xs text-muted">{playlist.updatedLabel}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={`Edit ${playlist.title}`}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-foreground hover:bg-white/5"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </button>
            <button
              type="button"
              aria-label={`Delete ${playlist.title}`}
              onClick={onDelete}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white hover:bg-accent-dark"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
