type StatCardProps = {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  accentClass?: string;
};

export function StatCard({
  label,
  value,
  delta,
  positive,
  accentClass = "from-accent/20",
}: StatCardProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-gradient-to-br ${accentClass} to-surface p-5`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className={`mt-2 text-sm font-medium ${positive ? "text-success" : "text-accent"}`}>
        {delta} vs prior period
      </p>
    </div>
  );
}
