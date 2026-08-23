"use client";

import { useState } from "react";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { Tabs } from "@/components/ui/Tabs";
import { GroupedBarChart } from "@/components/dashboard/channel-analytics/widgets/GroupedBarChart";
import { Panel } from "@/components/dashboard/channel-analytics/widgets/Panel";
import { formatUsdCompact, donutSegments, type AdFormatsData } from "@/lib/monetizationContent";
import { AdFormatCard } from "../widgets/AdFormatCard";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "formats", label: "By Format" },
  { id: "videos", label: "By Video" },
  { id: "trends", label: "Trends" },
  { id: "compare", label: "Comparison" },
];

export function AdFormatsSection({ data }: { data: AdFormatsData }) {
  const [tab, setTab] = useState("overview");

  const chart = (
    <div className="grid gap-4 xl:grid-cols-5">
      <Panel className="xl:col-span-3" title="Revenue by ad format" subtitle="Estimated earnings by type">
        <GroupedBarChart
          labels={data.formatBars.map((item) => item.label)}
          series={[
            {
              label: "Revenue",
              hex: "#ff3b4e",
              values: data.formatBars.map((item) => item.value),
            },
          ]}
          formatY={formatUsdCompact}
        />
      </Panel>
      <DonutChart
        title="Revenue distribution"
        subtitle="Share by format"
        total="100%"
        totalCaption="mix"
        segments={donutSegments(data.distribution)}
        formatValue={(value) => `${value}%`}
      />
    </div>
  );

  const cards = (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.cards.map((format) => (
        <AdFormatCard key={format.id} format={format} />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === "overview" || tab === "formats" || tab === "compare" ? chart : null}
      {tab === "overview" || tab === "formats" || tab === "videos" || tab === "trends" ? cards : null}
    </div>
  );
}
