"use client";

import { useState } from "react";
import { BarList } from "@/components/dashboard/BarList";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import {
  barItems,
  donutSegments,
  type EngagementData,
} from "@/lib/channelAnalyticsContent";
import { AiInsightCallout } from "../widgets/AiInsightCallout";
import { Heatmap } from "../widgets/Heatmap";
import { Panel } from "../widgets/Panel";
import { RadarChart } from "../widgets/RadarChart";
import { ScoreRing } from "../widgets/ScoreRing";
import { SimpleTable } from "../widgets/SimpleTable";
import { StatGrid } from "../widgets/StatGrid";
import { TrendLineChart } from "../widgets/TrendLineChart";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "likes", label: "Likes" },
  { id: "comments", label: "Comments" },
  { id: "shares", label: "Shares" },
  { id: "retention", label: "Retention" },
  { id: "sentiment", label: "Sentiment" },
];

export function EngagementSection({ data }: { data: EngagementData }) {
  const [tab, setTab] = useState("overview");
  const [metric, setMetric] = useState("all");

  const trendData =
    metric === "all"
      ? data.trend
      : {
          labels: data.trend.labels,
          series: data.trend.series.filter((item) => item.label.toLowerCase() === metric),
        };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Panel>
          <ScoreRing score={data.score} />
          <p className="mt-2 text-center text-xs font-semibold text-success">{data.scoreDelta}</p>
        </Panel>
        <div className="space-y-4">
          <StatGrid stats={data.tiles} tones={["success", "accent", "blue", "purple", "amber", "purple"]} />
          <AiInsightCallout title="AI engagement insights" body={data.aiInsight} />
        </div>
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "overview" ? (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-5">
            <Panel
              className="xl:col-span-3"
              title="Engagement trend"
              action={
                <Tabs
                  tabs={[
                    { id: "all", label: "All" },
                    { id: "likes", label: "Likes" },
                    { id: "comments", label: "Comments" },
                    { id: "shares", label: "Shares" },
                  ]}
                  value={metric}
                  onChange={setMetric}
                />
              }
            >
              <TrendLineChart data={trendData} />
            </Panel>
            <Panel className="xl:col-span-2" title="Best time to engage" subtitle="Based on your audience">
              <Heatmap data={data.engageHeatmap} />
            </Panel>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <DonutChart
              title="Engagement by content type"
              total="100%"
              segments={donutSegments(data.contentType)}
              formatValue={(value) => `${value}%`}
              totalCaption="mix"
            />
            <BarList title="Engagement sources" items={barItems(data.sources)} />
            <Panel title="Audience profile">
              <RadarChart axes={data.radar} />
            </Panel>
          </div>
        </div>
      ) : null}

      {tab === "likes" ? (
        <Panel title="Top liked videos">
          <SimpleTable
            columns={[
              { key: "title", label: "Video" },
              { key: "views", label: "Views", align: "right" },
              { key: "ctr", label: "CTR", align: "right" },
              { key: "engagement", label: "Engagement", align: "right" },
            ]}
            rows={data.likedVideos.map((video) => ({
              title: <span className="font-medium text-foreground">{video.title}</span>,
              views: video.views,
              ctr: video.ctr,
              engagement: (
                <Badge tone={video.engagement === "High" ? "success" : video.engagement === "Low" ? "amber" : "blue"} size="sm">
                  {video.engagement}
                </Badge>
              ),
            }))}
          />
        </Panel>
      ) : null}

      {tab === "comments" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <BarList title="Comment keywords" items={barItems(data.commentKeywords)} />
          <Panel title="Recent comments">
            <ul className="space-y-3">
              {data.comments.map((comment) => (
                <li key={comment.text} className="rounded-xl bg-surface-soft px-4 py-3">
                  <Badge
                    size="sm"
                    tone={
                      comment.sentiment === "positive"
                        ? "success"
                        : comment.sentiment === "negative"
                          ? "accent"
                          : "muted"
                    }
                  >
                    {comment.sentiment}
                  </Badge>
                  <p className="mt-2 text-sm text-foreground">{comment.text}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ) : null}

      {tab === "shares" ? (
        <BarList title="Share destinations" items={barItems(data.shareDestinations)} />
      ) : null}

      {tab === "retention" ? (
        <Panel title="Retention curve" subtitle="Still watching by video progress">
          <TrendLineChart data={data.retention} />
        </Panel>
      ) : null}

      {tab === "sentiment" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <DonutChart
            title="Comment sentiment"
            total={`${data.sentiment[0]?.value ?? 0}%`}
            segments={donutSegments(data.sentiment)}
            formatValue={(value) => `${value}%`}
            totalCaption={data.sentiment[0]?.label ?? "top"}
          />
          <Panel title="Sample comments">
            <ul className="space-y-3">
              {data.comments.map((comment) => (
                <li key={comment.text} className="rounded-xl bg-surface-soft px-4 py-3">
                  <Badge
                    size="sm"
                    tone={
                      comment.sentiment === "positive"
                        ? "success"
                        : comment.sentiment === "negative"
                          ? "accent"
                          : "muted"
                    }
                  >
                    {comment.sentiment}
                  </Badge>
                  <p className="mt-2 text-sm text-foreground">{comment.text}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
