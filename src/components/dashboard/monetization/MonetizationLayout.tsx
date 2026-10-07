"use client";

import type { ReactNode } from "react";
import { MonetizationHeaderStats } from "./MonetizationHeaderStats";
import { MonetizationProvider, useMonetization } from "./MonetizationProvider";
import type { MonetizationData } from "@/lib/monetizationContent";
import type { ConnectedChannel } from "@/lib/youtube/repo";

function MonetizationShell({ children }: { children: ReactNode }) {
  const { data, error, loading } = useMonetization();

  return (
    <div className="space-y-6 px-6 py-6">
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {loading ? <p className="text-sm text-muted">Loading YouTube analytics…</p> : null}
      {data ? (
        <>
          <MonetizationHeaderStats />
          {children}
        </>
      ) : (
        <p className="text-sm text-muted">Connect a YouTube channel to view analytics.</p>
      )}
    </div>
  );
}

export function MonetizationLayout({
  channel,
  initial,
  children,
}: {
  channel: ConnectedChannel | null;
  initial: MonetizationData | null;
  children: ReactNode;
}) {
  return (
    <MonetizationProvider channel={channel} initial={initial}>
      <MonetizationShell>{children}</MonetizationShell>
    </MonetizationProvider>
  );
}
