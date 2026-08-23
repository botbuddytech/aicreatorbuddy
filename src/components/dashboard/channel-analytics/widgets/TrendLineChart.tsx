import type { TrendBlock } from "@/lib/channelAnalyticsContent";

function formatAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(Math.round(value));
}

export function TrendLineChart({
  data,
  height = 220,
  visible,
}: {
  data: TrendBlock;
  height?: number;
  visible?: readonly string[];
}) {
  const series = visible ? data.series.filter((item) => visible.includes(item.label)) : data.series;
  const width = 640;
  const pad = { top: 16, right: 12, bottom: 28, left: 44 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const allValues = series.flatMap((item) => item.values);
  const max = Math.max(...allValues, 1);
  const count = Math.max(data.labels.length, 1);

  function xAt(index: number): number {
    return pad.left + (count <= 1 ? innerW / 2 : (index / (count - 1)) * innerW);
  }

  function yAt(value: number): number {
    return pad.top + innerH - (value / max) * innerH;
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full"
        role="img"
        aria-label="Trend over time"
      >
        {[0, 0.5, 1].map((tick) => {
          const y = yAt(max * tick);
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
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-muted text-[10px]">
                {formatAxis(max * tick)}
              </text>
            </g>
          );
        })}
        {series.map((item) => {
          const coords = item.values.map((value, index) => ({ x: xAt(index), y: yAt(value) }));
          const line = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
          const first = coords[0];
          const last = coords[coords.length - 1];
          const area =
            first && last
              ? `${line} L${last.x} ${pad.top + innerH} L${first.x} ${pad.top + innerH} Z`
              : "";
          return (
            <g key={item.label}>
              <path d={area} fill={item.hex} fillOpacity="0.16" />
              <path
                d={line}
                fill="none"
                stroke={item.hex}
                strokeWidth="2.25"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {coords.map((point, index) => (
                <circle key={`${item.label}-${index}`} cx={point.x} cy={point.y} r="3" fill={item.hex} />
              ))}
            </g>
          );
        })}
        {data.labels.map((label, index) => (
          <text
            key={label}
            x={xAt(index)}
            y={height - 8}
            textAnchor="middle"
            className="fill-muted text-[10px]"
          >
            {label}
          </text>
        ))}
      </svg>
      {series.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-3">
          {series.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-muted">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.hex }} />
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
