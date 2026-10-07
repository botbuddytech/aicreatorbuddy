"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { formatCount, type ChannelStatus } from "@/lib/dashboardContent";
import { type AnalyticsRange } from "@/lib/channelAnalyticsContent";
import { type MonetizationData } from "@/lib/monetizationContent";
import { channelInitials, timeAgo } from "@/lib/youtube/format";
import type { ConnectedChannel } from "@/lib/youtube/repo";

type MonetizationContextValue = {
  range: AnalyticsRange;
  setRange: (range: AnalyticsRange) => void;
  channel: ChannelStatus | null;
  data: MonetizationData | null;
  error: string | null;
  loading: boolean;
};

const MonetizationContext = createContext<MonetizationContextValue | null>(null);

function toChannelStatus(channel: ConnectedChannel, data: MonetizationData | null): ChannelStatus {
  return {
    id: channel.id,
    name: channel.title,
    initials: channelInitials(channel.title) || "CH",
    color: "bg-accent",
    subscribers: channel.hiddenSubscriberCount ? "Hidden" : formatCount(channel.subscriberCount),
    views: data?.channel.views ?? formatCount(channel.viewCount),
    revenue: data?.channel.revenue ?? "—",
    connected: channel.status === "ACTIVE",
    lastSync: timeAgo(channel.lastSyncedAt),
  };
}

export function MonetizationProvider({
  channel: selected,
  initial,
  children,
}: {
  channel: ConnectedChannel | null;
  initial: MonetizationData | null;
  children: ReactNode;
}) {
  const [range, setRangeState] = useState<AnalyticsRange>("28d");
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const channel = useMemo(() => (selected ? toChannelStatus(selected, data) : null), [selected, data]);

  async function setRange(next: AnalyticsRange) {
    setRangeState(next);
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dashboard/youtube/monetization?range=${encodeURIComponent(next)}`);
      const body = (await response.json()) as { data?: MonetizationData | null; error?: string };
      if (!response.ok) throw new Error(body.error || "Could not load analytics.");
      setData(body.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load analytics.");
    } finally {
      setLoading(false);
    }
  }

  const value = useMemo(
    () => ({ range, setRange, channel, data, error, loading }),
    [range, channel, data, error, loading],
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
