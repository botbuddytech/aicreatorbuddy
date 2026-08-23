"use client";

import { useMemo, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { ChannelCard } from "@/components/dashboard/ChannelCard";
import { ChannelAnalyticsPanel } from "@/components/dashboard/channel-analytics/ChannelAnalyticsPanel";
import { ChannelSelectDropdown } from "@/components/dashboard/channel-analytics/ChannelSelectDropdown";
import { ActionButton } from "@/components/ui/ActionButton";
import { workspaceChannels } from "@/lib/dashboardContent";

export default function ChannelsPage() {
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedChannel = useMemo(
    () => workspaceChannels.find((channel) => channel.id === selectedId) ?? null,
    [selectedId],
  );

  function connectNew() {
    setConnecting(true);
    setMessage("");
    window.setTimeout(() => {
      setConnecting(false);
      setMessage("Redirecting to YouTube OAuth… (demo only — no real redirect)");
    }, 900);
  }

  return (
    <>
      <Topbar
        title="YouTube Connections"
        subtitle="Link, sync, and inspect analytics for every channel in this workspace"
      />
      <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Channel</p>
            <p className="text-xs text-muted">
              Pick a connected channel to open its analytics workspace
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ChannelSelectDropdown selectedId={selectedId} onChange={setSelectedId} />
            <ActionButton
              loading={connecting}
              loadingLabel="Connecting…"
              onClick={connectNew}
            >
              Add channel
            </ActionButton>
          </div>
        </div>

        {message ? (
          <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
            {message}
          </p>
        ) : null}

        {selectedChannel ? (
          <ChannelAnalyticsPanel channel={selectedChannel} onBack={() => setSelectedId(null)} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {workspaceChannels.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  onOpenAnalytics={() => setSelectedId(channel.id)}
                />
              ))}

              <button
                type="button"
                onClick={connectNew}
                disabled={connecting}
                className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 p-5 text-center transition-colors hover:border-accent/50 hover:bg-surface disabled:opacity-60"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                </span>
                <p className="mt-3 font-display text-base font-semibold text-foreground">
                  {connecting ? "Connecting…" : "Connect a new channel"}
                </p>
                <p className="mt-1 text-sm text-muted">Secure YouTube OAuth · demo flow</p>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
