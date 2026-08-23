export function RealtimeBanner({
  viewers,
  viewsHour,
  newSubs,
}: {
  viewers: string;
  viewsHour: string;
  newSubs: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M23 12s-2.4-7-11-7S1 12 1 12s2.4 7 11 7 11-7 11-7zm-11 3.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z" />
          </svg>
        </span>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-display text-base font-semibold text-foreground">Realtime activity</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />
              Live
            </span>
          </div>
          <p className="text-xs text-muted">Updates every 10 seconds · demo snapshot</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted">Active viewers</p>
          <p className="mt-0.5 font-display text-lg font-semibold text-accent">{viewers}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Views · last hour</p>
          <p className="mt-0.5 font-display text-lg font-semibold text-foreground">{viewsHour}</p>
        </div>
        <div>
          <p className="text-xs text-muted">New subs today</p>
          <p className="mt-0.5 font-display text-lg font-semibold text-success">{newSubs}</p>
        </div>
      </div>
    </div>
  );
}
