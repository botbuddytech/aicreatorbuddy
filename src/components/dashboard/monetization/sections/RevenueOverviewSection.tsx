"use client";

import { useMemo, useState } from "react";
import { BarList } from "@/components/dashboard/BarList";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Panel } from "@/components/dashboard/channel-analytics/widgets/Panel";
import { SimpleTable } from "@/components/dashboard/channel-analytics/widgets/SimpleTable";
import { StatGrid } from "@/components/dashboard/channel-analytics/widgets/StatGrid";
import { TrendLineChart } from "@/components/dashboard/channel-analytics/widgets/TrendLineChart";
import {
  barItems,
  donutSegments,
  type OverviewData,
} from "@/lib/monetizationContent";
import { ListRow } from "../widgets/ListRow";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "ads", label: "Ad Revenue" },
  { id: "memberships", label: "Memberships" },
  { id: "supers", label: "Super Thanks" },
  { id: "merch", label: "Merchandise" },
];

const GRAIN = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

const statusTone = {
  Viral: "accent",
  Growing: "blue",
  Stable: "success",
} as const;

const membershipIcon = {
  crown: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 15l4-8 4 5 4-5 4 8H4zM4 18h16" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l2.4 6.8H21l-5.4 4.2 2 6.5L12 16.8 6.4 20.5l2-6.5L3 9.8h6.6z" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.8 8.6a5.5 5.5 0 0 0-7.8 0L12 9.6l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  ),
};

const txIcon: Record<string, { path: string; className: string }> = {
  payout: { path: "M12 5v14M5 12l7 7 7-7", className: "bg-success/15 text-success" },
  membership: {
    path: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    className: "bg-chart-purple/15 text-chart-purple",
  },
  superchat: {
    path: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z",
    className: "bg-chart-blue/15 text-chart-blue",
  },
  merch: {
    path: "M6 7h12l1 14H5L6 7zM9 7V5a3 3 0 0 1 6 0v2",
    className: "bg-chart-amber/15 text-chart-amber",
  },
  fee: { path: "M12 5v14M19 12H5", className: "bg-accent/15 text-accent" },
};

export function RevenueOverviewSection({ data }: { data: OverviewData }) {
  const [tab, setTab] = useState("overview");
  const [grain, setGrain] = useState("daily");
  const [query, setQuery] = useState("");

  const trend =
    grain === "weekly"
      ? data.revenueTrendWeekly
      : grain === "monthly"
        ? data.revenueTrendMonthly
        : data.revenueTrendDaily;

  const videos = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data.topVideos;
    return data.topVideos.filter((video) => video.title.toLowerCase().includes(needle));
  }, [data.topVideos, query]);

  const charts = (
    <>
      <div className="grid gap-4 xl:grid-cols-5">
        <Panel
          className="xl:col-span-3"
          title="Revenue trend"
          subtitle="Earnings over time"
          action={<Tabs tabs={GRAIN} value={grain} onChange={setGrain} />}
        >
          <TrendLineChart data={trend} />
        </Panel>
        <DonutChart
          title="Revenue sources"
          subtitle="Income mix"
          total="100%"
          totalCaption="share"
          segments={donutSegments(data.sources)}
          formatValue={(value) => `${value}%`}
        />
      </div>
      <StatGrid stats={data.adIncome} tones={["accent", "purple", "blue", "amber"]} />
    </>
  );

  return (
    <div className="space-y-4">
      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "overview" || tab === "ads" ? charts : null}

      {tab === "overview" ? (
        <Panel
          title="Top earning videos"
          subtitle="Highest revenue this period"
          action={
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search videos…"
              className="glass-field w-full rounded-xl border border-white/12 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted/70 focus:border-accent/50 sm:w-56"
            />
          }
        >
          <SimpleTable
            columns={[
              { key: "video", label: "Video" },
              { key: "views", label: "Views", align: "right" },
              { key: "revenue", label: "Revenue", align: "right" },
              { key: "rpm", label: "RPM", align: "right" },
              { key: "ctr", label: "CTR", align: "right" },
              { key: "status", label: "Status", align: "right" },
            ]}
            rows={videos.map((video) => ({
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
                  <p>{video.views}</p>
                  <p className="text-xs text-success">{video.viewsToday}</p>
                </div>
              ),
              revenue: <span className="font-semibold text-success">{video.revenue}</span>,
              rpm: video.rpm,
              ctr: video.ctr,
              status: (
                <Badge tone={statusTone[video.status]} size="sm">
                  {video.status}
                </Badge>
              ),
            }))}
          />
        </Panel>
      ) : null}

      {tab === "overview" || tab === "ads" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <BarList
            title="Ad format performance"
            subtitle="Revenue by ad type"
            items={barItems(data.adFormatBars)}
            formatValue={(value) => `${value}%`}
          />
          <Panel title="Revenue by region" subtitle="Top earning countries">
            <ul className="space-y-4">
              {data.regions.map((row) => (
                <li key={row.label} className="flex items-center gap-3">
                  <span className="text-lg" aria-hidden>
                    {row.flag}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-foreground">{row.label}</span>
                      <span className="shrink-0 font-medium text-muted">
                        {row.amount} · {row.value}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
                      <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.value}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ) : null}

      {tab === "overview" || tab === "memberships" ? (
        <Panel title="Channel memberships" subtitle="Active member breakdown">
          <div className="grid gap-2 md:grid-cols-3">
            {data.memberships.map((tier) => (
              <ListRow
                key={tier.name}
                icon={membershipIcon[tier.icon]}
                iconClass={tier.color}
                title={tier.name}
                subtitle={`${tier.price} · ${tier.members}`}
                value={tier.revenue}
              />
            ))}
          </div>
        </Panel>
      ) : null}

      {tab === "overview" || tab === "supers" ? (
        <Panel title="Super Chat top supporters" subtitle="This month's top contributors">
          <div className="grid gap-2 md:grid-cols-2">
            {data.supporters.map((row) => (
              <ListRow
                key={row.name}
                icon={<span className="text-xs font-bold">{row.rank}</span>}
                iconClass={row.highlight ? "bg-chart-amber/20 text-chart-amber" : "bg-surface-soft text-muted"}
                title={row.name}
                subtitle={row.count}
                value={row.amount}
                valueClass="text-chart-amber"
                highlight={row.highlight}
              />
            ))}
          </div>
        </Panel>
      ) : null}

      {tab === "overview" || tab === "merch" ? (
        <Panel title="Recent transactions" subtitle="Latest revenue activity">
          <div className="space-y-2">
            {data.transactions
              .filter((row) => (tab === "merch" ? row.kind === "merch" || row.kind === "fee" : true))
              .map((row) => {
                const icon = txIcon[row.kind] ?? txIcon.payout;
                return (
                  <ListRow
                    key={`${row.label}-${row.date}`}
                    icon={
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d={icon.path} />
                      </svg>
                    }
                    iconClass={icon.className}
                    title={row.label}
                    subtitle={row.date}
                    value={row.amount}
                    valueClass={row.positive ? "text-success" : "text-accent"}
                  />
                );
              })}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
