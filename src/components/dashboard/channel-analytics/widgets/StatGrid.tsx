import type { DeltaStat } from "@/lib/channelAnalyticsContent";
import { MetricTile } from "./MetricTile";

export function StatGrid({
  stats,
  tones,
}: {
  stats: readonly DeltaStat[];
  tones?: readonly ("accent" | "blue" | "purple" | "success" | "amber")[];
}) {
  const columns =
    stats.length >= 6
      ? "sm:grid-cols-2 xl:grid-cols-3"
      : stats.length === 3
        ? "sm:grid-cols-3"
        : stats.length > 3
          ? "sm:grid-cols-2 xl:grid-cols-4"
          : "sm:grid-cols-2";

  return (
    <div className={`grid gap-4 ${columns}`}>
      {stats.map((stat, index) => (
        <MetricTile key={stat.label} stat={stat} tone={tones?.[index] ?? "accent"} />
      ))}
    </div>
  );
}
