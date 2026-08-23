import { DonutChart } from "@/components/dashboard/DonutChart";
import { donutSegments, type DeviceMix } from "@/lib/channelAnalyticsContent";

export function DeviceBreakdown({
  data,
  title = "Device breakdown",
  subtitle = "How viewers watch your content",
}: {
  data: DeviceMix;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DonutChart
        title={title}
        subtitle={subtitle}
        total={`${data.donut[0]?.value ?? 0}%`}
        segments={donutSegments(data.donut)}
        formatValue={(value) => `${value}%`}
        totalCaption={data.donut[0]?.label ?? "top"}
      />
      <div className="grid grid-cols-2 gap-3">
        {data.tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-border bg-surface p-4">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${tile.color}`} />
            <p className="mt-3 text-sm text-muted">{tile.label}</p>
            <p className="mt-1 font-display text-xl font-semibold text-foreground">{tile.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
