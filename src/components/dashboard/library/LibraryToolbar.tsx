"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { workspaceChannels } from "@/lib/dashboardContent";
import type { LibraryViewMode } from "@/lib/contentLibrary";
import { Input } from "@/components/ui/Input";
import { ActionButton } from "@/components/ui/ActionButton";

export type LibraryChip = {
  id: string;
  label: string;
  href: string;
  count: number;
  icon: ReactNode;
};

export function LibraryToolbar({
  chips,
  activeId,
  query,
  onQueryChange,
  channelId,
  onChannelIdChange,
  viewMode,
  onViewModeChange,
  onExport,
  searchPlaceholder = "Search…",
}: {
  chips: LibraryChip[];
  activeId: string;
  query: string;
  onQueryChange: (value: string) => void;
  channelId: string;
  onChannelIdChange: (value: string) => void;
  viewMode: LibraryViewMode;
  onViewModeChange: (mode: LibraryViewMode) => void;
  onExport: () => void;
  searchPlaceholder?: string;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!filterRef.current?.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => {
          const active = chip.id === activeId;
          return (
            <Link
              key={chip.id}
              href={chip.href}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "bg-accent text-white"
                  : "border border-border bg-surface text-muted hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {chip.icon}
              {chip.label}
              <span className={active ? "text-white/80" : "text-muted"}>{chip.count}</span>
            </Link>
          );
        })}
      </div>

      <div className="relative min-w-0 flex-1">
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="pr-10"
          aria-label="Search library"
        />
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative" ref={filterRef}>
          <ActionButton variant="secondary" size="sm" onClick={() => setFilterOpen((open) => !open)}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M7 12h10M10 17h4" />
            </svg>
            Filter
          </ActionButton>
          {filterOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-border bg-surface p-2 shadow-xl">
              <p className="px-2 py-1 text-[11px] font-semibold tracking-wide text-muted uppercase">Channel</p>
              <button
                type="button"
                className={`flex w-full rounded-lg px-2 py-1.5 text-left text-sm ${
                  channelId === "all" ? "bg-accent/15 text-accent" : "text-foreground hover:bg-white/5"
                }`}
                onClick={() => {
                  onChannelIdChange("all");
                  setFilterOpen(false);
                }}
              >
                All channels
              </button>
              {workspaceChannels.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  className={`flex w-full rounded-lg px-2 py-1.5 text-left text-sm ${
                    channelId === channel.id ? "bg-accent/15 text-accent" : "text-foreground hover:bg-white/5"
                  }`}
                  onClick={() => {
                    onChannelIdChange(channel.id);
                    setFilterOpen(false);
                  }}
                >
                  {channel.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <ActionButton variant="secondary" size="sm" onClick={onExport}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export
        </ActionButton>

        <div className="flex overflow-hidden rounded-xl border border-border">
          <button
            type="button"
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
            onClick={() => onViewModeChange("grid")}
            className={`flex h-9 w-9 items-center justify-center ${
              viewMode === "grid" ? "bg-accent text-white" : "bg-surface text-muted hover:text-foreground"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="List view"
            aria-pressed={viewMode === "list"}
            onClick={() => onViewModeChange("list")}
            className={`flex h-9 w-9 items-center justify-center ${
              viewMode === "list" ? "bg-accent text-white" : "bg-surface text-muted hover:text-foreground"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
