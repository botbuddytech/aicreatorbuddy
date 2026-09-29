"use client";

import { useState, useTransition } from "react";
import { formatCount } from "@/lib/dashboardContent";
import type { ConnectedChannel } from "@/lib/youtube/repo";
import { channelInitials, timeAgo } from "@/lib/youtube/format";
import {
  disconnectChannelAction,
  leaveChannelAction,
  syncChannelAction,
} from "@/app/dashboard/channels/actions";

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
  onManageAccess,
  onNotice,
}: {
  channel: ConnectedChannel;
  onOpenVideos?: () => void;
  onManageAccess?: () => void;
  onNotice?: (notice: { kind: "success" | "error"; text: string }) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"sync" | "disconnect" | "leave" | null>(null);
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
    if (!window.confirm(`Disconnect "${channel.title}"? It will be removed for everyone with access.`)) {
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

  function leave() {
    if (!window.confirm(`Leave "${channel.title}"? This only removes your access; the owner keeps the channel.`)) {
      return;
    }
    setBusy("leave");
    startTransition(async () => {
      const result = await leaveChannelAction(channel.id);
      onNotice?.(
        result.ok
          ? { kind: "success", text: `${channel.title} removed from your account.` }
          : { kind: "error", text: `${channel.title}: ${result.error}` },
      );
      setBusy(null);
    });
  }

  return (
    <article
      className={`rounded-xl border bg-surface p-3 ${
        channel.isOwner ? "border-border" : "border-dashed border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <ChannelAvatar channel={channel} size="sm" />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{channel.title}</h3>
            <p className="truncate text-[11px] text-muted">
              {channel.googleEmail ?? channel.customUrl ?? channel.channelId}
            </p>
            {!channel.isOwner && channel.ownerEmail ? (
              <p className="truncate text-[11px] font-medium text-muted">
                Shared by {channel.ownerEmail}
              </p>
            ) : null}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            needsReauth ? "bg-accent/15 text-accent" : "bg-success/15 text-success"
          }`}
        >
          {needsReauth ? "Reconnect" : "Connected"}
        </span>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-lg bg-surface-soft px-1.5 py-1.5">
          <p className="text-[10px] text-muted">Subs</p>
          <p className="text-xs font-semibold text-foreground">
            {channel.hiddenSubscriberCount ? "Hidden" : formatCount(channel.subscriberCount)}
          </p>
        </div>
        <div className="rounded-lg bg-surface-soft px-1.5 py-1.5">
          <p className="text-[10px] text-muted">Views</p>
          <p className="text-xs font-semibold text-foreground">{formatCount(channel.viewCount)}</p>
        </div>
        <div className="rounded-lg bg-surface-soft px-1.5 py-1.5">
          <p className="text-[10px] text-muted">Uploads</p>
          <p className="text-xs font-semibold text-foreground">{formatCount(channel.syncedVideoCount)}</p>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-muted">Synced {timeAgo(channel.lastSyncedAt)}</p>

      <div className="mt-2.5 space-y-1.5">
        {onOpenVideos ? (
          <button
            type="button"
            onClick={onOpenVideos}
            className="w-full rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            View videos
          </button>
        ) : null}
        <div className="grid grid-cols-2 gap-1.5">
          {needsReauth && channel.isOwner ? (
            <a
              href="/api/youtube/connect"
              className="inline-flex items-center justify-center rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
            >
              Reconnect
            </a>
          ) : needsReauth ? (
            <button
              type="button"
              disabled
              title="The channel owner must reconnect this channel."
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted opacity-60"
            >
              Owner reconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={sync}
              disabled={pending}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-white/5 disabled:opacity-60"
            >
              {busy === "sync" ? "Syncing…" : "Sync"}
            </button>
          )}
          <button
            type="button"
            onClick={channel.isOwner ? disconnect : leave}
            disabled={pending}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-60"
          >
            {busy === "disconnect" || busy === "leave"
              ? "Removing…"
              : channel.isOwner
                ? "Disconnect"
                : "Leave"}
          </button>
        </div>
        {channel.isOwner && onManageAccess ? (
          <button
            type="button"
            onClick={onManageAccess}
            className="w-full rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-white/5"
          >
            Manage access{channel.shareCount > 0 ? ` · ${channel.shareCount}` : ""}
          </button>
        ) : null}
      </div>
    </article>
  );
}
