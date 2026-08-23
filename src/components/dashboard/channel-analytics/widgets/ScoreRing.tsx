export function ScoreRing({
  score,
  max = 10,
  label = "Engagement score",
}: {
  score: number;
  max?: number;
  label?: string;
}) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(score / max, 1);
  const offset = circumference * (1 - ratio);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-40 w-40">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-border"
            strokeWidth="12"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#ff3b4e"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-3xl font-semibold text-foreground">{score.toFixed(1)}</p>
          <p className="text-xs text-muted">/ {max}</p>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{label}</p>
    </div>
  );
}
