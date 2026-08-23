export function GroupedBarChart({
  labels,
  series,
}: {
  labels: readonly string[];
  series: readonly { label: string; hex: string; values: number[] }[];
}) {
  const max = Math.max(...series.flatMap((item) => item.values), 1);
  const groupWidth = 72;
  const barWidth = 14;
  const height = 200;
  const pad = { top: 12, right: 8, bottom: 28, left: 36 };
  const width = pad.left + pad.right + labels.length * groupWidth;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full" role="img" aria-label="Age and gender">
      {[0, 0.5, 1].map((tick) => {
        const y = pad.top + (height - pad.top - pad.bottom) * (1 - tick);
        return (
          <g key={tick}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y}
              y2={y}
              stroke="currentColor"
              className="text-border"
              strokeWidth="1"
            />
            <text x={pad.left - 6} y={y + 4} textAnchor="end" className="fill-muted text-[10px]">
              {Math.round(max * tick)}%
            </text>
          </g>
        );
      })}
      {labels.map((label, index) => {
        const groupX = pad.left + index * groupWidth + 12;
        return (
          <g key={label}>
            {series.map((item, seriesIndex) => {
              const value = item.values[index] ?? 0;
              const h = ((height - pad.top - pad.bottom) * value) / max;
              const x = groupX + seriesIndex * (barWidth + 4);
              const y = height - pad.bottom - h;
              return (
                <rect
                  key={item.label}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={h}
                  rx="3"
                  fill={item.hex}
                />
              );
            })}
            <text
              x={groupX + (series.length * (barWidth + 4)) / 2}
              y={height - 8}
              textAnchor="middle"
              className="fill-muted text-[10px]"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
