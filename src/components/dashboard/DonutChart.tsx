type Segment = {
  label: string;
  value: number;
  color: string;
};

export function DonutChart({
  title,
  subtitle,
  total,
  segments,
  summaries,
  formatValue,
  totalCaption = "tracked",
}: {
  title: string;
  subtitle?: string;
  total: string;
  segments: readonly Segment[];
  summaries?: readonly { label: string; value: string }[];
  formatValue?: (value: number) => string;
  totalCaption?: string;
}) {
  const sum = segments.reduce((acc, s) => acc + s.value, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const slices = segments.map((segment, index) => {
    const length = sum === 0 ? 0 : (segment.value / sum) * circumference;
    const offset = segments.slice(0, index).reduce((acc, item) => {
      return acc + (sum === 0 ? 0 : (item.value / sum) * circumference);
    }, 0);
    return { segment, length, offset };
  });

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}

      <div className="mt-6 flex flex-col items-center gap-6 lg:flex-row lg:items-start">
        <div className="relative h-44 w-44 shrink-0">
          <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
            {slices.map(({ segment, length, offset }) => (
              <circle
                key={segment.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="16"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-display text-2xl font-semibold text-foreground">{total}</p>
            <p className="text-xs text-muted">{totalCaption}</p>
          </div>
        </div>

        <ul className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
          {segments.map((segment) => (
            <li key={segment.label} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-muted">{segment.label}</span>
              <span className="ml-auto font-medium text-foreground">
                {formatValue ? formatValue(segment.value) : segment.value}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {summaries ? (
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5">
          {summaries.map((item) => (
            <div key={item.label} className="rounded-xl bg-surface-soft px-4 py-3">
              <p className="text-xs text-muted">{item.label}</p>
              <p className="mt-1 font-display text-xl font-semibold text-foreground">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
