type Segment = {
  label: string;
  value: number;
  color: string;
};

export function AudienceCard({
  segments,
  primary,
}: {
  segments: readonly Segment[];
  primary: string | null;
}) {
  const sum = segments.reduce((acc, segment) => acc + segment.value, 0);
  const radius = 58;
  const stroke = 22;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const slices = segments.map((segment) => {
    const length = sum === 0 ? 0 : (segment.value / sum) * circumference;
    const slice = { segment, length, offset };
    offset += length;
    return slice;
  });
  const lead = primary ? segments.find((segment) => segment.label === primary) : null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-display text-lg font-semibold text-foreground">Audience</h3>
      <p className="mt-1 text-sm text-muted">Demographics breakdown</p>
      {lead ? (
        <p className="mt-3 text-sm text-foreground">
          Most logged-in viewers are <span className="font-semibold">{lead.label}</span>
          <span className="text-muted"> · {lead.value}%</span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">
          YouTube only shares age groups after enough logged-in viewers watch in this range. This channel is still under that threshold, so the report comes back empty.
        </p>
      )}

      {segments.length > 0 ? (
        <>
          <div className="mx-auto mt-4 h-52 w-52">
            <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" role="img" aria-label="Audience age breakdown">
              <circle cx="80" cy="80" r={radius} fill="none" className="stroke-surface-soft" strokeWidth={stroke} />
              {slices.map(({ segment, length, offset: sliceOffset }) => (
                <circle
                  key={segment.label}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-sliceOffset}
                />
              ))}
            </svg>
          </div>
          <ul className="mt-5 space-y-3">
            {segments.map((segment) => {
              const isPrimary = segment.label === primary;
              return (
                <li key={segment.label} className="flex items-center gap-3 text-sm">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className={isPrimary ? "font-semibold text-foreground" : "text-foreground"}>
                    {segment.label}
                  </span>
                  <span className={`ml-auto tabular-nums ${isPrimary ? "font-semibold text-foreground" : "text-muted"}`}>
                    {segment.value}%
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
