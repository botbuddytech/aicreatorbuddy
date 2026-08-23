"use client";

import { useState } from "react";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { donutSegments, type OverviewData } from "@/lib/channelAnalyticsContent";
import { AiInsightCallout } from "../widgets/AiInsightCallout";
import { DeviceBreakdown } from "../widgets/DeviceBreakdown";
import { GeoList } from "../widgets/GeoList";
import { GroupedBarChart } from "../widgets/GroupedBarChart";
import { Heatmap } from "../widgets/Heatmap";
import { MetricTile } from "../widgets/MetricTile";
import { Panel } from "../widgets/Panel";
import { RealtimeBanner } from "../widgets/RealtimeBanner";
import { SimpleTable } from "../widgets/SimpleTable";
import { StatGrid } from "../widgets/StatGrid";
import { TrendLineChart } from "../widgets/TrendLineChart";

export function OverviewSection({ data }: { data: OverviewData }) {
  const [trend, setTrend] = useState("views");
  const engagementLabel: Record<string, "success" | "blue" | "amber"> = {
    High: "success",
    Medium: "blue",
    Low: "amber",
  };

  return (
    <div className="space-y-4">
      <RealtimeBanner
        viewers={data.live.viewers}
        viewsHour={data.live.viewsHour}
        newSubs={data.live.newSubs}
      />
      <StatGrid stats={data.stats} tones={["accent", "blue", "success", "purple"]} />

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Views & watch time"
          subtitle="Performance over the selected period"
          action={
            <Tabs
              tabs={[
                { id: "views", label: "Views" },
                { id: "watch", label: "Watch time" },
                { id: "both", label: "Both" },
              ]}
              value={trend}
              onChange={setTrend}
            />
          }
        >
          <TrendLineChart
            data={
              trend === "watch"
                ? data.watchTrend
                : trend === "both"
                  ? {
                      labels: data.viewsTrend.labels,
                      series: [...data.viewsTrend.series, ...data.watchTrend.series],
                    }
                  : data.viewsTrend
            }
          />
        </Panel>
        <DonutChart
          title="Traffic sources"
          subtitle="Where viewers find your content"
          total="100%"
          segments={donutSegments(data.trafficDonut)}
          formatValue={(value) => `${value}%`}
          totalCaption="mix"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Engagement" subtitle="How viewers interact with your content">
          <div className="grid grid-cols-2 gap-3">
            {data.engagementTiles.map((tile, index) => (
              <MetricTile
                key={tile.label}
                stat={tile}
                tone={(["success", "accent", "blue", "purple"] as const)[index] ?? "accent"}
              />
            ))}
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted">Avg. view duration</span>
              <span className="font-medium text-foreground">
                {data.avgDuration.watched} / {data.avgDuration.length}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
              <div
                className="h-full rounded-full bg-chart-purple"
                style={{ width: `${data.avgDuration.percent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">{data.avgDuration.percent}% average percentage viewed</p>
          </div>
        </Panel>
        <Panel title="Audience mix" subtitle="Age & gender breakdown">
          <GroupedBarChart
            labels={data.ageGender.ages}
            series={[
              { label: "Male", hex: "#3b82f6", values: data.ageGender.male },
              { label: "Female", hex: "#fb7185", values: data.ageGender.female },
            ]}
          />
          <div className="mt-3 flex gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-chart-blue" /> Male
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent" /> Female
            </span>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Panel className="xl:col-span-3" title="Top performing videos" subtitle="Best videos in the selected period">
          <SimpleTable
            columns={[
              { key: "video", label: "Video" },
              { key: "views", label: "Views", align: "right" },
              { key: "watch", label: "Watch time", align: "right" },
              { key: "ctr", label: "CTR", align: "right" },
              { key: "engagement", label: "Engagement", align: "right" },
            ]}
            rows={data.topVideos.map((video) => ({
              video: (
                <div>
                  <p className="font-medium text-foreground">{video.title}</p>
                  <p className="text-xs text-muted">
                    {video.duration} · {video.published}
                  </p>
                </div>
              ),
              views: (
                <div>
                  <p className="text-foreground">{video.views}</p>
                  <p className={`text-xs ${video.viewsPositive ? "text-success" : "text-chart-amber"}`}>
                    {video.viewsDelta}
                  </p>
                </div>
              ),
              watch: (
                <div>
                  <p className="text-foreground">{video.watchTime}</p>
                  <p className="text-xs text-muted">{video.avd}</p>
                </div>
              ),
              ctr: (
                <div>
                  <p className="text-foreground">{video.ctr}</p>
                  <p className="text-xs text-muted">{video.ctrLabel}</p>
                </div>
              ),
              engagement: (
                <Badge tone={engagementLabel[video.engagement] ?? "muted"} size="sm">
                  {video.engagement}
                </Badge>
              ),
            }))}
          />
        </Panel>
        <Panel className="xl:col-span-2" title="Best posting times" subtitle="When your audience is most active">
          <Heatmap data={data.postingHeatmap} />
          <div className="mt-4">
            <AiInsightCallout title="AI recommendation" body={data.postingInsight} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GeoList rows={data.geo} footer="View all countries →" />
        <DeviceBreakdown data={data.devices} />
      </div>
    </div>
  );
}
