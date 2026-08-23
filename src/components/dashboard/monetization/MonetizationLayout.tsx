"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { ChannelSelectDropdown } from "@/components/dashboard/channel-analytics/ChannelSelectDropdown";
import { MonetizationChannelPicker } from "./MonetizationChannelPicker";
import { MonetizationHeaderStats } from "./MonetizationHeaderStats";
import { MonetizationProvider, useMonetization } from "./MonetizationProvider";

const COPY: Record<string, { title: string; subtitle: string }> = {
  "/dashboard/analytics": {
    title: "Revenue Overview",
    subtitle: "Track your YouTube earnings and monetization performance",
  },
  "/dashboard/analytics/rpm-cpm": {
    title: "RPM / CPM Insights",
    subtitle: "Analyze your revenue metrics and optimize earnings",
  },
  "/dashboard/analytics/top-videos": {
    title: "Top Earning Videos",
    subtitle: "Videos generating the most revenue this period",
  },
  "/dashboard/analytics/ad-formats": {
    title: "Ad Formats Breakdown",
    subtitle: "Analyze revenue by ad type and optimize monetization",
  },
};

function MonetizationShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { selectedId, setSelectedId, data } = useMonetization();
  const copy = COPY[pathname] ?? {
    title: "Monetization Analytics",
    subtitle: "Track your YouTube earnings and monetization performance",
  };

  return (
    <>
      <Topbar title={copy.title} subtitle={copy.subtitle} />
      <div className="space-y-6 px-6 py-6">
        {data ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                Switch channel to compare monetization across the workspace
              </p>
              <ChannelSelectDropdown selectedId={selectedId} onChange={setSelectedId} />
            </div>
            <MonetizationHeaderStats />
            {children}
          </>
        ) : (
          <MonetizationChannelPicker />
        )}
      </div>
    </>
  );
}

export function MonetizationLayout({ children }: { children: ReactNode }) {
  return (
    <MonetizationProvider>
      <MonetizationShell>{children}</MonetizationShell>
    </MonetizationProvider>
  );
}
