"use client";

import type { ReactNode } from "react";
import { MonetizationHeaderStats } from "./MonetizationHeaderStats";
import { MonetizationProvider, useMonetization } from "./MonetizationProvider";
import type { ConnectedChannel } from "@/lib/youtube/repo";

function MonetizationShell({ children }: { children: ReactNode }) {
  const { data } = useMonetization();

  return (
    <div className="space-y-6 px-6 py-6">
      {data ? (
        <>
          <MonetizationHeaderStats />
          {children}
        </>
      ) : (
        <p className="text-sm text-muted">Select a channel to view analytics.</p>
      )}
    </div>
  );
}

export function MonetizationLayout({
  channel,
  children,
}: {
  channel: ConnectedChannel | null;
  children: ReactNode;
}) {
  return (
    <MonetizationProvider channel={channel}>
      <MonetizationShell>{children}</MonetizationShell>
    </MonetizationProvider>
  );
}
