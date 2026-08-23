"use client";

import { useMemo, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Select } from "@/components/ui/Select";
import {
  analyticsRangeOptions,
  getChannelAnalytics,
  type AnalyticsRange,
  type AnalyticsSection,
} from "@/lib/channelAnalyticsContent";
import type { ChannelStatus } from "@/lib/dashboardContent";
import { ChannelAnalyticsSidebar } from "./ChannelAnalyticsSidebar";
import { OverviewSection } from "./sections/OverviewSection";
import { AudienceSection } from "./sections/AudienceSection";
import { EngagementSection } from "./sections/EngagementSection";
import { TrafficSection } from "./sections/TrafficSection";
import { FloatingCustomizeButton } from "./widgets/FloatingCustomizeButton";

export function ChannelAnalyticsPanel({
  channel,
  onBack,
}: {
  channel: ChannelStatus;
  onBack: () => void;
}) {
  const [section, setSection] = useState<AnalyticsSection>("overview");
  const [range, setRange] = useState<AnalyticsRange>("28d");
  const [refreshing, setRefreshing] = useState(false);
  const analytics = useMemo(() => getChannelAnalytics(channel, range), [channel, range]);

  function refresh() {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 700);
  }

  return (
    <div className="relative space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">Channel analytics</h2>
          <p className="text-sm text-muted">
            {channel.name} · per-channel performance in this workspace
          </p>
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
          <ActionButton
            variant="secondary"
            size="sm"
            loading={refreshing}
            loadingLabel="Refreshing…"
            onClick={refresh}
          >
            Refresh
          </ActionButton>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <ChannelAnalyticsSidebar
          channel={channel}
          section={section}
          onSectionChange={setSection}
          onBack={onBack}
        />
        <div className="min-w-0">
          {section === "overview" ? <OverviewSection data={analytics.overview} /> : null}
          {section === "audience" ? <AudienceSection data={analytics.audience} /> : null}
          {section === "engagement" ? <EngagementSection data={analytics.engagement} /> : null}
          {section === "traffic" ? <TrafficSection data={analytics.traffic} /> : null}
        </div>
      </div>
      <FloatingCustomizeButton />
    </div>
  );
}
