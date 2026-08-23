import type { HeatmapBlock } from "@/lib/channelAnalyticsContent";

function cellColor(value: number): string {
  const alpha = 0.12 + value * 0.88;
  return `rgba(255, 59, 78, ${alpha.toFixed(3)})`;
}

export function Heatmap({
  data,
  legend = true,
}: {
  data: HeatmapBlock;
  legend?: boolean;
}) {
  return (
    <div>
      <div className="overflow-x-auto">
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `auto repeat(${data.cols.length}, minmax(1.1rem, 1fr))`,
          }}
        >
          <span />
          {data.cols.map((col) => (
            <span key={col} className="text-center text-[10px] text-muted">
              {col}
            </span>
          ))}
          {data.rows.map((row, rowIndex) => (
            <div key={row} className="contents">
              <span className="pr-2 text-right text-[11px] text-muted">{row}</span>
              {(data.values[rowIndex] ?? []).map((value, colIndex) => (
                <span
                  key={`${row}-${data.cols[colIndex] ?? colIndex}`}
                  title={`${row} ${data.cols[colIndex] ?? ""} · ${Math.round(value * 100)}%`}
                  className="h-4 min-w-4 rounded-sm sm:h-5"
                  style={{ backgroundColor: cellColor(value) }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {legend ? (
        <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-muted">
          <span>Low</span>
          <span className="flex overflow-hidden rounded-sm">
            {[0.15, 0.35, 0.55, 0.75, 0.95].map((value) => (
              <span
                key={value}
                className="h-3 w-4"
                style={{ backgroundColor: cellColor(value) }}
              />
            ))}
          </span>
          <span>High</span>
        </div>
      ) : null}
    </div>
  );
}
