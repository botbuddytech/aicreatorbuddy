"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChannelAvatar } from "@/components/dashboard/ChannelCard";
import { setActiveChannelAction } from "@/app/dashboard/actions";
import type { ConnectedChannel } from "@/lib/youtube/repo";

export function ActiveChannelPicker({
  channels,
  activeChannelId,
}: {
  channels: ConnectedChannel[];
  activeChannelId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(activeChannelId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedId(activeChannelId);
  }, [activeChannelId]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const selected = channels.find((channel) => channel.id === selectedId) ?? null;

  async function choose(channelId: string) {
    if (channelId === selectedId || saving) {
      setOpen(false);
      return;
    }
    const previous = selectedId;
    setSelectedId(channelId);
    setOpen(false);
    setError(null);
    setSaving(true);
    const result = await setActiveChannelAction(channelId);
    setSaving(false);
    if (!result.ok) {
      setSelectedId(previous);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (channels.length === 0) {
    return (
      <Link
        href="/dashboard/channels"
        className="inline-flex w-full max-w-xl items-center rounded-2xl border border-border bg-surface px-4 py-3.5 text-base font-medium text-foreground hover:bg-white/5"
      >
        Connect a channel
      </Link>
    );
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-xl">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={saving}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-base font-medium text-foreground hover:bg-white/5 disabled:opacity-70"
      >
        {selected ? (
          <ChannelAvatar channel={selected} size="md" />
        ) : (
          <span className="h-2.5 w-2.5 rounded-full bg-chart-amber" />
        )}
        <span className="min-w-0 flex-1 truncate text-left">
          {selected ? selected.title : "Select a channel"}
        </span>
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {error ? <p className="mt-1 text-xs text-accent">{error}</p> : null}
      {open ? (
        <div
          role="listbox"
          aria-label="Channels"
          className="absolute left-0 z-30 mt-2 w-full rounded-2xl border border-border bg-surface p-1.5 shadow-xl"
        >
          {channels.map((channel) => {
            const isSelected = channel.id === selectedId;
            return (
              <button
                key={channel.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-base text-foreground hover:bg-white/5"
                onClick={() => choose(channel.id)}
              >
                <ChannelAvatar channel={channel} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{channel.title}</span>
                  {channel.customUrl ? (
                    <span className="block truncate text-xs text-muted">{channel.customUrl}</span>
                  ) : null}
                </span>
                {isSelected ? <span className="text-xs text-success">Selected</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
