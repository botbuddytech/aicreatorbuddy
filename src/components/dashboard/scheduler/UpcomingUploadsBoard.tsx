"use client";

import { useMemo, useState } from "react";
import { PlaceholderImage } from "@/components/create/PlaceholderImage";
import { ActionButton } from "@/components/ui/ActionButton";
import { Input } from "@/components/ui/Input";
import { upcomingUploads, type UpcomingUploadStatus } from "@/lib/dashboardContent";

const FILTERS: { id: "all" | UpcomingUploadStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "scheduled", label: "Scheduled" },
  { id: "processing", label: "Processing" },
  { id: "ready", label: "Ready" },
];

const statusClass: Record<UpcomingUploadStatus, string> = {
  scheduled: "bg-chart-blue/15 text-chart-blue",
  processing: "bg-chart-amber/15 text-chart-amber",
  ready: "bg-success/15 text-success",
};

export function UpcomingUploadsBoard() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return upcomingUploads.filter((item) => {
      const matchStatus = filter === "all" || item.status === filter;
      const matchQuery = q.length === 0 || item.title.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [filter, query]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((item) => {
            const active = filter === item.id;
            const count = item.id === "all" ? upcomingUploads.length : upcomingUploads.filter((video) => video.status === item.id).length;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-accent text-white"
                    : "border border-border bg-surface text-muted hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {item.label}
                {item.id === "all" ? <span className={active ? "text-white/80" : "text-muted"}> ({count})</span> : null}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-0 flex-1">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search uploads…"
            className="pr-10"
            aria-label="Search upcoming uploads"
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
          <ActionButton variant="secondary" size="sm" type="button">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M7 12h10M10 17h4" />
            </svg>
            Filter
          </ActionButton>
          <ActionButton variant="secondary" size="sm" type="button">
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
              onClick={() => setViewMode("grid")}
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
              onClick={() => setViewMode("list")}
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

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-5 py-10 text-center text-sm text-muted">
          No uploads match this filter.
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((video) => (
            <article key={video.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="relative">
                <PlaceholderImage label={video.title} className="aspect-video w-full rounded-none" />
                <span
                  className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusClass[video.status]}`}
                >
                  {video.status}
                </span>
                <span className="absolute right-2 bottom-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {video.duration}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2 p-4">
                <div>
                  <h4 className="line-clamp-2 text-sm font-semibold text-foreground">{video.title}</h4>
                  <p className="mt-1 text-xs text-muted">{video.scheduledLabel}</p>
                </div>
                <button type="button" aria-label={`More options for ${video.title}`} className="text-muted hover:text-foreground">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((video) => (
            <article
              key={video.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-3"
            >
              <PlaceholderImage label={video.title} className="h-16 w-[6.5rem] shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-semibold text-foreground">{video.title}</h4>
                <p className="mt-1 text-xs text-muted">
                  {video.scheduledLabel} · {video.duration}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusClass[video.status]}`}>
                {video.status}
              </span>
              <button type="button" aria-label={`More options for ${video.title}`} className="text-muted hover:text-foreground">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
