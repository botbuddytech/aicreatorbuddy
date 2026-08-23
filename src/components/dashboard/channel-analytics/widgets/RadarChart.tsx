export function RadarChart({
  axes,
}: {
  axes: readonly { label: string; value: number }[];
}) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 84;
  const count = axes.length || 1;

  function point(index: number, magnitude: number): { x: number; y: number } {
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
    return {
      x: cx + Math.cos(angle) * radius * magnitude,
      y: cy + Math.sin(angle) * radius * magnitude,
    };
  }

  const polygon = axes
    .map((axis, index) => {
      const p = point(index, Math.min(axis.value, 100) / 100);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-56 w-56" role="img" aria-label="Audience profile">
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon
          key={ring}
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth="1"
          points={Array.from({ length: count }, (_, index) => {
            const p = point(index, ring);
            return `${p.x},${p.y}`;
          }).join(" ")}
        />
      ))}
      {axes.map((axis, index) => {
        const outer = point(index, 1);
        const label = point(index, 1.22);
        return (
          <g key={axis.label}>
            <line
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke="currentColor"
              className="text-border"
              strokeWidth="1"
            />
            <text x={label.x} y={label.y} textAnchor="middle" className="fill-muted text-[10px]">
              {axis.label}
            </text>
          </g>
        );
      })}
      <polygon points={polygon} fill="rgba(255, 59, 78, 0.22)" stroke="#ff3b4e" strokeWidth="2" />
      {axes.map((axis, index) => {
        const p = point(index, Math.min(axis.value, 100) / 100);
        return <circle key={`dot-${axis.label}`} cx={p.x} cy={p.y} r="3.5" fill="#ff3b4e" />;
      })}
    </svg>
  );
}
