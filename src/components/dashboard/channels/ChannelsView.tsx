"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { ChannelCard } from "@/components/dashboard/ChannelCard";
import { ChannelVideosPanel } from "@/components/dashboard/channels/ChannelVideosPanel";
import type { ConnectedChannel, VideoPage } from "@/lib/youtube/repo";
import { loadChannelVideosAction } from "@/app/dashboard/channels/actions";

type Notice = { kind: "success" | "error"; text: string };

export function ChannelsView({
  channels,
  initialNotice,
}: {
  channels: ConnectedChannel[];
  initialNotice: Notice | null;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice | null>(initialNotice);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [videoPage, setVideoPage] = useState<VideoPage | null>(null);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const requestRef = useRef(0);

  const selected = channels.find((c) => c.id === selectedId) ?? null;

  function openChannel(id: string) {
    const requestId = ++requestRef.current;
    setSelectedId(id);
    setVideoPage(null);
    setLoadingVideos(true);
    loadChannelVideosAction(id, null)
      .then((page) => {
        if (requestRef.current === requestId) setVideoPage(page);
      })
      .catch((err: unknown) => {
        if (requestRef.current !== requestId) return;
        setNotice({ kind: "error", text: err instanceof Error ? err.message : "Could not load videos." });
        setSelectedId(null);
      })
      .finally(() => {
        if (requestRef.current === requestId) setLoadingVideos(false);
      });
  }

  function closeChannel() {
    requestRef.current += 1;
    setSelectedId(null);
    setVideoPage(null);
    setLoadingVideos(false);
  }

  // After an OAuth redirect, drop ?connected / ?error from the URL once the banner is shown.
  useEffect(() => {
    if (initialNotice) router.replace("/dashboard/channels");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            {channels.length} connected channel{channels.length === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-muted">
            Each channel signs in with its own Google account. Add as many as you need.
          </p>
        </div>
        <a
          href="/api/youtube/connect"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
        >
          Add channel
        </a>
      </div>

      {notice ? (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            notice.kind === "error"
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-success/40 bg-success/10 text-success"
          }`}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="shrink-0 text-xs font-semibold opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {selected ? (
        loadingVideos || !videoPage ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted">
            Loading videos for {selected.title}…
          </div>
        ) : (
          <ChannelVideosPanel
            key={selected.id}
            channel={selected}
            initialPage={videoPage}
            onBack={closeChannel}
          />
        )
      ) : channels.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {channels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onOpenVideos={() => openChannel(channel.id)}
              onNotice={setNotice}
            />
          ))}
          <AddTile />
        </div>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
      </svg>
    </span>
  );
}

function AddTile() {
  return (
    <a
      href="/api/youtube/connect"
      className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 p-5 text-center transition-colors hover:border-accent/50 hover:bg-surface"
    >
      <PlusIcon />
      <p className="mt-3 font-display text-base font-semibold text-foreground">Connect another channel</p>
      <p className="mt-1 text-sm text-muted">Secure Google OAuth · pick any Gmail or brand account</p>
    </a>
  );
}

function EmptyState() {
  return (
    <a
      href="/api/youtube/connect"
      className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 p-8 text-center transition-colors hover:border-accent/50 hover:bg-surface"
    >
      <PlusIcon />
      <p className="mt-4 font-display text-xl font-semibold text-foreground">
        Connect your first YouTube channel
      </p>
      <p className="mt-2 max-w-md text-sm text-muted">
        You&apos;ll be sent to Google to choose an account. We pull the channel profile, subscriber
        count, and every upload with views and likes.
      </p>
    </a>
  );
}
