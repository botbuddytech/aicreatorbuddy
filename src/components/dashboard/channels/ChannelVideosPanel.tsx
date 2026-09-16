"use client";

import { useState, useTransition } from "react";
import { ChannelAvatar } from "@/components/dashboard/ChannelCard";
import { formatCount, formatInt } from "@/lib/dashboardContent";
import { formatDate, formatDuration, timeAgo, visibilityLabel } from "@/lib/youtube/format";
import type { ChannelVideo, ConnectedChannel, VideoPage } from "@/lib/youtube/repo";
import { loadChannelVideosAction } from "@/app/dashboard/channels/actions";

export function ChannelVideosPanel({
  channel,
  initialPage,
  onBack,
}: {
  channel: ConnectedChannel;
  initialPage: VideoPage;
  onBack: () => void;
}) {
  const [items, setItems] = useState<ChannelVideo[]>(initialPage.items);
  const [cursor, setCursor] = useState<string | null>(initialPage.nextCursor);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function loadMore() {
    if (!cursor) return;
    setError("");
    startTransition(async () => {
      try {
        const page = await loadChannelVideosAction(channel.id, cursor);
        setItems((prev) => [...prev, ...page.items]);
        setCursor(page.nextCursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load more videos.");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-surface">
      <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-white/5 hover:text-foreground"
          >
            ← All channels
          </button>
          <ChannelAvatar channel={channel} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-semibold text-foreground">{channel.title}</h2>
            <p className="text-xs text-muted">
              {channel.hiddenSubscriberCount
                ? "Subscribers hidden"
                : `${formatCount(channel.subscriberCount)} subscribers`}{" "}
              · {formatCount(channel.viewCount)} views ·{" "}
              {formatInt(channel.syncedVideoCount)} uploads ({formatInt(channel.videoCount)} public) · synced{" "}
              {timeAgo(channel.lastSyncedAt)}
            </p>
          </div>
        </div>
        <a
          href={`https://www.youtube.com/channel/${channel.channelId}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-accent hover:text-accent-dark"
        >
          Open on YouTube ↗
        </a>
      </div>

      {items.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted">
          No videos synced yet. Use Sync on the channel card to pull uploads.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr className="border-b border-border">
                <th className="px-5 py-3 font-medium">Video</th>
                <th className="px-3 py-3 font-medium">Visibility</th>
                <th className="px-3 py-3 font-medium">Uploaded</th>
                <th className="px-3 py-3 text-right font-medium">Views</th>
                <th className="px-3 py-3 text-right font-medium">Likes</th>
                <th className="px-3 py-3 text-right font-medium">Comments</th>
                <th className="px-5 py-3 text-right font-medium">Length</th>
              </tr>
            </thead>
            <tbody>
              {items.map((video) => (
                <tr key={video.id} className="border-b border-border/60 last:border-0 hover:bg-white/[0.03]">
                  <td className="px-5 py-3">
                    <a
                      href={`https://www.youtube.com/watch?v=${video.videoId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3"
                    >
                      {video.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={video.thumbnailUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-12 w-20 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="h-12 w-20 shrink-0 rounded-lg bg-surface-soft" />
                      )}
                      <span className="min-w-0">
                        <span className="block max-w-[360px] truncate font-medium text-foreground">
                          {video.title}
                        </span>
                      </span>
                    </a>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        video.privacyStatus === "public" && video.uploadStatus === "processed"
                          ? "bg-success/15 text-success"
                          : "bg-white/5 text-muted"
                      }`}
                    >
                      {visibilityLabel(video.privacyStatus, video.uploadStatus)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted">{formatDate(video.publishedAt)}</td>
                  <td className="px-3 py-3 text-right text-foreground">{formatInt(video.viewCount)}</td>
                  <td className="px-3 py-3 text-right text-foreground">{formatInt(video.likeCount)}</td>
                  <td className="px-3 py-3 text-right text-foreground">{formatInt(video.commentCount)}</td>
                  <td className="px-5 py-3 text-right text-muted">{formatDuration(video.durationSec)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error ? <p className="px-5 pb-4 text-sm text-accent">{error}</p> : null}

      {cursor ? (
        <div className="border-t border-border p-4 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={pending}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-white/5 disabled:opacity-60"
          >
            {pending ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
