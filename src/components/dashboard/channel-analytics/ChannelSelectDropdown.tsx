"use client";

import { useEffect, useRef, useState } from "react";
import type { ChannelStatus } from "@/lib/dashboardContent";
import { workspaceChannels } from "@/lib/dashboardContent";

export function ChannelSelectDropdown({
  selectedId,
  onChange,
}: {
  selectedId: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = workspaceChannels.find((channel) => channel.id === selectedId) ?? null;

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function choose(channel: ChannelStatus | null) {
    onChange(channel?.id ?? null);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-w-[220px] items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-white/5"
      >
        {selected ? (
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${selected.color}`}
          >
            {selected.initials}
          </span>
        ) : (
          <span className="h-2 w-2 rounded-full bg-success" />
        )}
        <span className="flex-1 truncate text-left">
          {selected ? selected.name : "All channels"}
        </span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div className="absolute left-0 z-30 mt-2 w-64 rounded-xl border border-border bg-surface p-1 shadow-xl">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-white/5"
            onClick={() => choose(null)}
          >
            All channels
          </button>
          {workspaceChannels.map((channel) => (
            <button
              key={channel.id}
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-white/5"
              onClick={() => choose(channel)}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${channel.color}`}
              >
                {channel.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{channel.name}</span>
                <span className="block text-[11px] text-muted">
                  {channel.connected ? `Synced ${channel.lastSync}` : "Disconnected"}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
