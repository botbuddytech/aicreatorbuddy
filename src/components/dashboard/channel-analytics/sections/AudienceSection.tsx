"use client";

import { useState } from "react";
import { BarList } from "@/components/dashboard/BarList";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { Tabs } from "@/components/ui/Tabs";
import {
  barItems,
  donutSegments,
  type AudienceData,
} from "@/lib/channelAnalyticsContent";
import { AiInsightCallout } from "../widgets/AiInsightCallout";
import { DeviceBreakdown } from "../widgets/DeviceBreakdown";
import { GeoList } from "../widgets/GeoList";
import { Heatmap } from "../widgets/Heatmap";
import { Panel } from "../widgets/Panel";
import { StatGrid } from "../widgets/StatGrid";
import { TrendLineChart } from "../widgets/TrendLineChart";

const TABS = [
  { id: "demographics", label: "Demographics" },
  { id: "geography", label: "Geographic" },
  { id: "behavior", label: "Viewer behavior" },
  { id: "growth", label: "Subscriber growth" },
  { id: "devices", label: "Devices" },
];

export function AudienceSection({ data }: { data: AudienceData }) {
  const [tab, setTab] = useState("demographics");

  return (
    <div className="space-y-4">
      <StatGrid stats={data.stats} tones={["success", "accent", "blue", "purple"]} />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "demographics" ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <BarList title="Age distribution" subtitle="Viewer age breakdown" items={barItems(data.ageBars)} />
            <DonutChart
              title="Gender"
              subtitle="Audience gender split"
              total={`${data.genderDonut[0]?.value ?? 0}%`}
              segments={donutSegments(data.genderDonut)}
              formatValue={(value) => `${value}%`}
              totalCaption={data.genderDonut[0]?.label ?? "top"}
            />
            <DonutChart
              title="Subscriber status"
              subtitle="Who's watching your content"
              total={`${data.subscriberDonut[0]?.value ?? 0}%`}
              segments={donutSegments(data.subscriberDonut)}
              formatValue={(value) => `${value}%`}
              totalCaption={data.subscriberDonut[0]?.label ?? "status"}
            />
          </div>
          <Panel title="Primary audience" subtitle="Highest concentration age group">
            <p className="font-display text-2xl font-semibold text-foreground">{data.primaryAudience}</p>
            <div className="mt-4">
              <AiInsightCallout body={data.demoInsight} />
            </div>
          </Panel>
        </div>
      ) : null}

      {tab === "geography" ? <GeoList rows={data.geo} title="Geographic distribution" subtitle="Top countries by views" footer="View all countries →" /> : null}

      {tab === "behavior" ? (
        <div className="space-y-4">
          <Panel title="When your audience watches" subtitle="Peak viewing hours">
            <Heatmap data={data.watchHeatmap} />
            <div className="mt-4">
              <AiInsightCallout title="Best time to post" body={data.watchInsight} />
            </div>
          </Panel>
          <StatGrid stats={data.sessionTiles} tones={["purple", "blue", "success"]} />
        </div>
      ) : null}

      {tab === "growth" ? (
        <Panel title="Subscriber growth" subtitle="Net subscribers over the selected range">
          <TrendLineChart data={data.growthTrend} />
        </Panel>
      ) : null}

      {tab === "devices" ? (
        <div className="space-y-4">
          <DeviceBreakdown data={data.devices} title="Devices & playback" />
          <div className="grid gap-4 lg:grid-cols-2">
            <BarList title="Operating system" items={barItems(data.devices.os)} />
            <BarList title="Playback location" items={barItems(data.devices.playback)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
