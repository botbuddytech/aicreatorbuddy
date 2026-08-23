import type { EarningVideo } from "@/lib/monetizationContent";

const rankStyles = [
  "bg-chart-amber text-background",
  "bg-white/10 text-foreground",
  "bg-chart-amber/40 text-foreground",
];

export function RankedVideoCard({ video, rank }: { video: EarningVideo; rank: number }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="relative aspect-video bg-gradient-to-br from-accent/30 via-surface-soft to-chart-purple/20">
        <span
          className={`absolute top-3 left-3 flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
            rankStyles[rank - 1] ?? "bg-white/10 text-foreground"
          }`}
        >
          {rank === 1 ? "♛" : rank}
        </span>
        <span className="absolute right-3 bottom-3 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {video.duration}
        </span>
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 font-display text-sm font-semibold text-foreground">{video.title}</h3>
        <div className="mt-3 flex items-center gap-2">
          <p className="font-display text-lg font-semibold text-chart-purple">{video.revenue}</p>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              video.positive ? "bg-success/15 text-success" : "bg-chart-amber/15 text-chart-amber"
            }`}
          >
            {video.delta}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          {video.views} views · {video.published}
        </p>
      </div>
    </article>
  );
}
