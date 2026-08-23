export function AiInsightCallout({
  title = "AI insight",
  body,
}: {
  title?: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-accent/20 bg-accent/10 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3l1.6 4.8L18 9.4l-4.4 1.6L12 16l-1.6-4.99L6 9.4l4.4-1.6L12 3z" />
            <path d="M19 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
        </div>
      </div>
    </div>
  );
}
