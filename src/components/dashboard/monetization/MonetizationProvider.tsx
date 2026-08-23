"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { workspaceChannels, type ChannelStatus } from "@/lib/dashboardContent";
import { type AnalyticsRange } from "@/lib/channelAnalyticsContent";
import { getMonetizationData, type MonetizationData } from "@/lib/monetizationContent";

type MonetizationContextValue = {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  range: AnalyticsRange;
  setRange: (range: AnalyticsRange) => void;
  channel: ChannelStatus | null;
  data: MonetizationData | null;
};

const MonetizationContext = createContext<MonetizationContextValue | null>(null);

export function MonetizationProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [range, setRange] = useState<AnalyticsRange>("28d");

  const channel = useMemo(
    () => workspaceChannels.find((item) => item.id === selectedId) ?? null,
    [selectedId],
  );

  const data = useMemo(
    () => (channel ? getMonetizationData(channel, range) : null),
    [channel, range],
  );

  const value = useMemo(
    () => ({ selectedId, setSelectedId, range, setRange, channel, data }),
    [selectedId, range, channel, data],
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
