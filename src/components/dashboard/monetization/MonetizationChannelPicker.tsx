"use client";

import { ChannelCard } from "@/components/dashboard/ChannelCard";
import { ChannelSelectDropdown } from "@/components/dashboard/channel-analytics/ChannelSelectDropdown";
import { workspaceChannels } from "@/lib/dashboardContent";
import { useMonetization } from "./MonetizationProvider";

export function MonetizationChannelPicker() {
  const { selectedId, setSelectedId } = useMonetization();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Channel</p>
          <p className="text-xs text-muted">
            Pick a connected channel to open its monetization analytics
          </p>
        </div>
        <ChannelSelectDropdown selectedId={selectedId} onChange={setSelectedId} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {workspaceChannels.map((channel) => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            ctaLabel="View monetization"
            onOpenAnalytics={() => setSelectedId(channel.id)}
          />
        ))}
      </div>
    </div>
  );
}
