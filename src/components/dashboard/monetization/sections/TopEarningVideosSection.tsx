"use client";

import { useMemo, useState } from "react";
import { BarList } from "@/components/dashboard/BarList";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { MiniSpark } from "@/components/dashboard/channel-analytics/widgets/MiniSpark";
import { Panel } from "@/components/dashboard/channel-analytics/widgets/Panel";
import { SimpleTable } from "@/components/dashboard/channel-analytics/widgets/SimpleTable";
import { TrendLineChart } from "@/components/dashboard/channel-analytics/widgets/TrendLineChart";
import { donutSegments, type TopVideosData } from "@/lib/monetizationContent";
import { ListRow } from "../widgets/ListRow";
import { PaginationBar } from "../widgets/PaginationBar";
import { ProgressStatCard } from "../widgets/ProgressStatCard";
import { RankedVideoCard } from "../widgets/RankedVideoCard";

const TABS = [
  { id: "all", label: "All Videos" },
  { id: "short", label: "Shorts" },
  { id: "long", label: "Long Form" },
  { id: "live", label: "Live Streams" },
];

const PAGE_SIZE = 5;
const tones = ["success", "accent", "blue", "purple"] as const;
const statusTone = { Viral: "accent", Growing: "blue", Stable: "success" } as const;

export function TopEarningVideosSection({ data }: { data: TopVideosData }) {
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (tab === "all") return data.videos;
    return data.videos.filter((video) => video.format === tab);
  }, [data.videos, tab]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const slice = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((stat, index) => (
          <ProgressStatCard key={stat.label} stat={stat} tone={tones[index] ?? "accent"} />
        ))}
      </div>

      <Tabs
        tabs={TABS}
        value={tab}
        onChange={(id) => {
          setTab(id);
          setPage(1);
        }}
      />

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="grid gap-4 sm:grid-cols-3 xl:col-span-3">
          {data.leaderboard.map((video, index) => (
            <RankedVideoCard key={video.id} video={video} rank={index + 1} />
          ))}
        </div>
        <DonutChart
          title="Revenue mix"
          subtitle="By source"
          total="100%"
          totalCaption="share"
          segments={donutSegments(data.breakdown)}
          formatValue={(value) => `${value}%`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Panel
          className="xl:col-span-3"
          title="All earning videos"
          subtitle={`Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
        >
          <SimpleTable
            columns={[
              { key: "rank", label: "#" },
              { key: "video", label: "Video" },
              { key: "revenue", label: "Revenue", align: "right" },
              { key: "views", label: "Views", align: "right" },
              { key: "rpm", label: "RPM", align: "right" },
              { key: "status", label: "Status", align: "right" },
            ]}
            rows={slice.map((video, index) => ({
              rank: (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-xs font-bold text-accent">
                  {(currentPage - 1) * PAGE_SIZE + index + 1}
                </span>
              ),
              video: (
                <div>
                  <p className="font-medium text-foreground">{video.title}</p>
                  <p className="text-xs text-muted">
                    {video.duration} · {video.published}
                  </p>
                </div>
              ),
              revenue: <span className="font-semibold text-accent">{video.revenue}</span>,
              views: video.views,
              rpm: video.rpm,
              status: (
                <span className="inline-flex items-center gap-2">
                  <Badge tone={statusTone[video.status]} size="sm">
                    {video.status}
                  </Badge>
                  <MiniSpark values={video.trend} up={video.trendUp} />
                </span>
              ),
            }))}
          />
          <PaginationBar
            page={currentPage}
            pageCount={pageCount}
            showing={`${slice.length} videos on this page`}
            onChange={setPage}
          />
        </Panel>

        <div className="space-y-4">
          <Panel title="Live leaderboard" subtitle="Top earners right now">
            <div className="space-y-2">
              {data.liveLeaderboard.map((video, index) => (
                <ListRow
                  key={video.id}
                  icon={<span className="text-xs font-bold">{index + 1}</span>}
                  iconClass={index === 0 ? "bg-accent/20 text-accent" : "bg-surface-soft text-muted"}
                  title={video.title}
                  subtitle={`${video.views} views`}
                  value={video.revenue}
                  valueClass="text-accent"
                />
              ))}
            </div>
          </Panel>
          <Panel title="Revenue trend" subtitle="Monthly earnings">
            <TrendLineChart data={data.trend} height={180} />
          </Panel>
          <BarList
            title="Top categories"
            subtitle="Revenue by topic"
            items={data.categories.map((row) => ({
              label: `${row.label} · ${row.amount}`,
              value: row.value,
              color: row.color,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
