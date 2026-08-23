export function MiniSpark({ values, up }: { values: readonly number[]; up: boolean }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const width = 72;
  const height = 24;
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = values.length <= 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-6 w-16" aria-hidden>
      <polyline
        fill="none"
        stroke={up ? "#22c55e" : "#f59e0b"}
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
