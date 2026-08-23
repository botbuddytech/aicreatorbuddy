"use client";

import { useState } from "react";
import type { ChannelStatus } from "@/lib/dashboardContent";

export function ChannelCard({
  channel,
  onOpenAnalytics,
  ctaLabel = "View analytics",
}: {
  channel: ChannelStatus;
  onOpenAnalytics?: () => void;
  ctaLabel?: string;
}) {
  const [connected, setConnected] = useState(channel.connected);
  const [busy, setBusy] = useState(false);

  function toggle() {
    setBusy(true);
    window.setTimeout(() => {
      setConnected((v) => !v);
      setBusy(false);
    }, 700);
  }

  return (
    <article className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white ${channel.color}`}
          >
            {channel.initials}
          </span>
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">
              {channel.name}
            </h3>
            <p className="text-xs text-muted">Synced {channel.lastSync}</p>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            connected
              ? "bg-success/15 text-success"
              : "bg-white/5 text-muted"
          }`}
        >
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-surface-soft px-2 py-3">
          <p className="text-xs text-muted">Subs</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{channel.subscribers}</p>
        </div>
        <div className="rounded-xl bg-surface-soft px-2 py-3">
          <p className="text-xs text-muted">Views</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{channel.views}</p>
        </div>
        <div className="rounded-xl bg-surface-soft px-2 py-3">
          <p className="text-xs text-muted">Revenue</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{channel.revenue}</p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {onOpenAnalytics ? (
          <button
            type="button"
            onClick={onOpenAnalytics}
            className="w-full rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            {ctaLabel}
          </button>
        ) : null}
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-white/5 disabled:opacity-60"
        >
          {busy ? "Working…" : connected ? "Disconnect" : "Reconnect"}
        </button>
      </div>
    </article>
  );
}
