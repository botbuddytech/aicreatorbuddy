"use client";

import { ActionButton } from "@/components/ui/ActionButton";
import { Select } from "@/components/ui/Select";
import { StatGrid } from "@/components/dashboard/channel-analytics/widgets/StatGrid";
import { analyticsRangeOptions, type AnalyticsRange } from "@/lib/channelAnalyticsContent";
import { useMonetization } from "./MonetizationProvider";

export function MonetizationHeaderStats() {
  const { data, range, setRange, channel } = useMonetization();
  if (!data || !channel) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">{channel.name}</h2>
          <p className="text-sm text-muted">Monetization performance for the selected period</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={range}
            onChange={(event) => setRange(event.target.value as AnalyticsRange)}
            className="w-auto min-w-[160px]"
          >
            {analyticsRangeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
          <ActionButton variant="secondary" size="sm">
            Filter
          </ActionButton>
          <ActionButton variant="secondary" size="sm">
            Export
          </ActionButton>
        </div>
      </div>
      <StatGrid stats={data.header} tones={["success", "accent", "blue", "purple"]} />
    </div>
  );
}
