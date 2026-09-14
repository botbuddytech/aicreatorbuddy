"use client";

import { useState, useTransition } from "react";
import { formatCount } from "@/lib/dashboardContent";
import type { ConnectedChannel } from "@/lib/youtube/repo";
import { channelInitials, timeAgo } from "@/lib/youtube/format";
import { disconnectChannelAction, syncChannelAction } from "@/app/dashboard/channels/actions";

export function ChannelAvatar({
  channel,
  size = "md",
}: {
  channel: Pick<ConnectedChannel, "title" | "thumbnailUrl">;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "lg" ? "h-14 w-14 text-base" : size === "sm" ? "h-6 w-6 text-[10px]" : "h-11 w-11 text-sm";
  if (channel.thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={channel.thumbnailUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={`${dims} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      className={`flex ${dims} shrink-0 items-center justify-center rounded-full bg-accent font-bold text-white`}
    >
      {channelInitials(channel.title)}
    </span>
  );
}

export function ChannelCard({
  channel,
  onOpenVideos,
  onNotice,
}: {
  channel: ConnectedChannel;
  onOpenVideos?: () => void;
  onNotice?: (notice: { kind: "success" | "error"; text: string }) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"sync" | "disconnect" | null>(null);
  const needsReauth = channel.status !== "ACTIVE";

  function sync() {
    setBusy("sync");
    startTransition(async () => {
      const result = await syncChannelAction(channel.id);
      onNotice?.(
        result.ok
          ? { kind: "success", text: `${channel.title}: ${result.message ?? "Synced."}` }
          : { kind: "error", text: `${channel.title}: ${result.error}` },
      );
      setBusy(null);
    });
  }

  function disconnect() {
    if (!window.confirm(`Disconnect "${channel.title}"? Its synced videos will be removed from this workspace.`)) {
      return;
    }
    setBusy("disconnect");
    startTransition(async () => {
      const result = await disconnectChannelAction(channel.id);
      onNotice?.(
        result.ok
          ? { kind: "success", text: `${channel.title} disconnected.` }
          : { kind: "error", text: `${channel.title}: ${result.error}` },
      );
      setBusy(null);
    });
  }

  return (
    <article className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ChannelAvatar channel={channel} />
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-semibold text-foreground">
              {channel.title}
            </h3>
            <p className="truncate text-xs text-muted">
              {channel.googleEmail ?? channel.customUrl ?? channel.channelId}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            needsReauth ? "bg-accent/15 text-accent" : "bg-success/15 text-success"
          }`}
        >
          {needsReauth ? "Reconnect needed" : "Connected"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-surface-soft px-2 py-3">
          <p className="text-xs text-muted">Subs</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {channel.hiddenSubscriberCount ? "Hidden" : formatCount(channel.subscriberCount)}
          </p>
        </div>
        <div className="rounded-xl bg-surface-soft px-2 py-3">
          <p className="text-xs text-muted">Views</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{formatCount(channel.viewCount)}</p>
        </div>
        <div className="rounded-xl bg-surface-soft px-2 py-3">
          <p className="text-xs text-muted">Uploads</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{formatCount(channel.syncedVideoCount)}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">Synced {timeAgo(channel.lastSyncedAt)}</p>

      <div className="mt-4 space-y-2">
        {onOpenVideos ? (
          <button
            type="button"
            onClick={onOpenVideos}
            className="w-full rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            View videos
          </button>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          {needsReauth ? (
            <a
              href="/api/youtube/connect"
              className="inline-flex items-center justify-center rounded-xl border border-accent/40 bg-accent/10 px-3 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
            >
              Reconnect
            </a>
          ) : (
            <button
              type="button"
              onClick={sync}
              disabled={pending}
              className="rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-white/5 disabled:opacity-60"
            >
              {busy === "sync" ? "Syncing…" : "Sync"}
            </button>
          )}
          <button
            type="button"
            onClick={disconnect}
            disabled={pending}
            className="rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-60"
          >
            {busy === "disconnect" ? "Removing…" : "Disconnect"}
          </button>
        </div>
      </div>
    </article>
  );
}
