"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { formatCount, type ChannelStatus } from "@/lib/dashboardContent";
import { type AnalyticsRange } from "@/lib/channelAnalyticsContent";
import { getMonetizationData, type MonetizationData } from "@/lib/monetizationContent";
import { channelInitials, timeAgo } from "@/lib/youtube/format";
import type { ConnectedChannel } from "@/lib/youtube/repo";

type MonetizationContextValue = {
  range: AnalyticsRange;
  setRange: (range: AnalyticsRange) => void;
  channel: ChannelStatus | null;
  data: MonetizationData | null;
};

const MonetizationContext = createContext<MonetizationContextValue | null>(null);

function toChannelStatus(channel: ConnectedChannel): ChannelStatus {
  const revenue = Math.max(1200, Math.round(channel.viewCount / 800));
  return {
    id: channel.id,
    name: channel.title,
    initials: channelInitials(channel.title) || "CH",
    color: "bg-accent",
    subscribers: channel.hiddenSubscriberCount ? "Hidden" : formatCount(channel.subscriberCount),
    views: formatCount(channel.viewCount),
    revenue: `$${revenue}`,
    connected: channel.status === "ACTIVE",
    lastSync: timeAgo(channel.lastSyncedAt),
  };
}

export function MonetizationProvider({
  channel: selected,
  children,
}: {
  channel: ConnectedChannel | null;
  children: ReactNode;
}) {
  const [range, setRange] = useState<AnalyticsRange>("28d");
  const channel = useMemo(() => (selected ? toChannelStatus(selected) : null), [selected]);
  const data = useMemo(
    () => (channel ? getMonetizationData(channel, range) : null),
    [channel, range],
  );

  const value = useMemo(
    () => ({ range, setRange, channel, data }),
    [range, channel, data],
  );

  return <MonetizationContext.Provider value={value}>{children}</MonetizationContext.Provider>;
}

export function useMonetization() {
  const value = useContext(MonetizationContext);
  if (!value) {
    throw new Error("useMonetization must be used within MonetizationProvider");
  }
  return value;
}
