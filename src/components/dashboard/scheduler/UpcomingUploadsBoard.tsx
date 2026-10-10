"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { PlaceholderImage } from "@/components/create/PlaceholderImage";
import { ActionButton } from "@/components/ui/ActionButton";
import { Input } from "@/components/ui/Input";
import { type UpcomingUpload, type UpcomingUploadStatus } from "@/lib/dashboardContent";

const FILTERS: { id: "all" | UpcomingUploadStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "scheduled", label: "Scheduled" },
  { id: "processing", label: "Processing" },
  { id: "ready", label: "Ready" },
];

const HIDDEN_KEY = "aicb-upcoming-hidden";

const statusClass: Record<UpcomingUploadStatus, string> = {
  scheduled: "bg-chart-blue/15 text-chart-blue",
  processing: "bg-chart-amber/15 text-chart-amber",
  ready: "bg-success/15 text-success",
};

type SortMode = "title" | "schedule";

function readHidden(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(sessionStorage.getItem(HIDDEN_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeHidden(ids: string[]) {
  sessionStorage.setItem(HIDDEN_KEY, JSON.stringify(ids));
}

function UploadThumb({
  title,
  url,
  className,
}: {
  title: string;
  url?: string | null;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return <PlaceholderImage label={title} hideLabel className={className} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className={`bg-surface-soft object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  );
}

function menuPosition(button: DOMRect): { top: number; left: number } {
  const width = 192;
  const height = 156;
  const left = Math.min(Math.max(8, button.right - width), window.innerWidth - width - 8);
  const below = button.bottom + 4;
  const top =
    below + height > window.innerHeight - 8 && button.top - height - 4 > 8
      ? button.top - height - 4
      : below;
  return { top, left };
}

function RowMenu({
  video,
  open,
  onToggle,
  onClose,
  onHide,
}: {
  video: UpcomingUpload;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onHide: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    const button = rootRef.current?.getBoundingClientRect();
    if (button) setMenuStyle(menuPosition(button));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, open]);

  async function copyTitle() {
    try {
      await navigator.clipboard.writeText(video.title);
    } catch {
      /* clipboard can be blocked; the menu still closes */
    }
    onClose();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`More options for ${video.title}`}
        aria-expanded={open}
        onClick={onToggle}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-soft text-muted transition-colors hover:bg-white/10 hover:text-foreground ${open ? "border-accent/40 bg-accent/15 text-foreground" : ""}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {open && menuStyle
        ? createPortal(
            <div
              ref={menuRef}
              style={{ position: "fixed", top: menuStyle.top, left: menuStyle.left, zIndex: 80 }}
              className="w-48 rounded-xl border border-border bg-surface py-1 text-sm shadow-lg"
            >
          {video.sessionId ? (
            <Link
              href={`/dashboard/create/${video.sessionId}`}
              className="block px-3 py-2 text-foreground hover:bg-white/5"
              onClick={onClose}
            >
              Open project
            </Link>
          ) : null}
          {video.youtubeUrl ? (
            <a
              href={video.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="block px-3 py-2 text-foreground hover:bg-white/5"
              onClick={onClose}
            >
              Open in YouTube Studio
            </a>
          ) : null}
          <button type="button" className="block w-full px-3 py-2 text-left text-foreground hover:bg-white/5" onClick={() => void copyTitle()}>
            Copy title
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-foreground hover:bg-white/5"
            onClick={() => {
              onHide();
              onClose();
            }}
          >
            Hide from this list
          </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function UpcomingUploadsBoard({
  uploads,
  liveJobId,
  liveProgress,
}: {
  uploads: UpcomingUpload[];
  liveJobId?: string | null;
  liveProgress?: number;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortMode, setSortMode] = useState<SortMode>("schedule");
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<string[]>(readHidden);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen) return;
    function onPointer(event: MouseEvent) {
      if (!filterRef.current?.contains(event.target as Node)) setFilterOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [filterOpen]);

  function hide(id: string) {
    setHiddenIds((current) => {
      const next = current.includes(id) ? current : [...current, id];
      writeHidden(next);
      return next;
    });
  }

  function showHidden() {
    setHiddenIds([]);
    writeHidden([]);
    setFilterOpen(false);
  }

  const visibleUploads = useMemo(
    () => uploads.filter((item) => !hiddenIds.includes(item.id)),
    [hiddenIds, uploads],
  );

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = visibleUploads.filter((item) => {
      const matchStatus = filter === "all" || item.status === filter;
      const matchQuery = q.length === 0 || item.title.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
    return [...matched].sort((a, b) => {
      if (sortMode === "title") return a.title.localeCompare(b.title);
      return a.scheduledLabel.localeCompare(b.scheduledLabel);
    });
  }, [filter, query, sortMode, visibleUploads]);

  function exportCsv() {
    const header = ["title", "status", "when", "duration"];
    const lines = items.map((item) =>
      [item.title, item.status, item.scheduledLabel, item.duration]
        .map((cell) => `"${cell.replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "upcoming-uploads.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function progressFor(video: UpcomingUpload): number | null {
    const isLive = liveJobId != null && video.id === liveJobId;
    if (!isLive || liveProgress == null) return null;
    return Math.round(Math.min(1, liveProgress) * 100);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((item) => {
            const active = filter === item.id;
            const count =
              item.id === "all" ? visibleUploads.length : visibleUploads.filter((video) => video.status === item.id).length;
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
          {hiddenIds.length > 0 ? (
            <button
              type="button"
              onClick={showHidden}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-accent hover:bg-white/5"
            >
              Show hidden ({hiddenIds.length})
            </button>
          ) : null}
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
          <div ref={filterRef} className="relative">
            <ActionButton variant="secondary" size="sm" type="button" aria-expanded={filterOpen} onClick={() => setFilterOpen((open) => !open)}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M7 12h10M10 17h4" />
              </svg>
              Sort
            </ActionButton>
            {filterOpen ? (
              <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-surface py-1 text-sm shadow-lg">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left hover:bg-white/5"
                  onClick={() => {
                    setSortMode("title");
                    setFilterOpen(false);
                  }}
                >
                  Sort by title
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left hover:bg-white/5"
                  onClick={() => {
                    setSortMode("schedule");
                    setFilterOpen(false);
                  }}
                >
                  Sort by schedule label
                </button>
                {hiddenIds.length > 0 ? (
                  <button type="button" className="block w-full px-3 py-2 text-left hover:bg-white/5" onClick={showHidden}>
                    Show hidden ({hiddenIds.length})
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <ActionButton variant="secondary" size="sm" type="button" onClick={exportCsv}>
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
          {hiddenIds.length > 0 ? (
            <button type="button" className="mt-3 block w-full font-semibold text-accent" onClick={showHidden}>
              Show {hiddenIds.length} hidden
            </button>
          ) : null}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((video) => {
            const progressPct = progressFor(video);
            return (
              <article key={video.id} className="rounded-2xl border border-border bg-surface">
                <div className="relative overflow-hidden rounded-t-2xl">
                  <UploadThumb title={video.title} url={video.thumbnailUrl} className="aspect-video w-full rounded-none" />
                  <span className="absolute right-2 bottom-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {video.duration}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <h4 className="line-clamp-2 min-w-0 flex-1 text-sm font-semibold text-foreground">{video.title}</h4>
                      {filter === "all" ? (
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusClass[video.status]}`}>
                          {video.status}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted">{video.scheduledLabel}</p>
                    {progressPct != null ? (
                      <div className="mt-2">
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progressPct}%` }} />
                        </div>
                        <p className="mt-1 text-[10px] font-semibold text-muted">{progressPct}%</p>
                      </div>
                    ) : null}
                  </div>
                  <RowMenu
                    video={video}
                    open={menuId === video.id}
                    onToggle={() => setMenuId((current) => (current === video.id ? null : video.id))}
                    onClose={() => setMenuId(null)}
                    onHide={() => hide(video.id)}
                  />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((video) => {
            const progressPct = progressFor(video);
            return (
              <article key={video.id} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-3">
                <UploadThumb title={video.title} url={video.thumbnailUrl} className="h-16 w-[6.5rem] shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-semibold text-foreground">{video.title}</h4>
                  <p className="mt-1 text-xs text-muted">
                    {video.scheduledLabel} · {video.duration}
                  </p>
                  {progressPct != null ? (
                    <div className="mt-2 max-w-xs">
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>
                  ) : null}
                </div>
                {filter === "all" ? (
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusClass[video.status]}`}>
                    {video.status}
                  </span>
                ) : null}
                <RowMenu
                  video={video}
                  open={menuId === video.id}
                  onToggle={() => setMenuId((current) => (current === video.id ? null : video.id))}
                  onClose={() => setMenuId(null)}
                  onHide={() => hide(video.id)}
                />
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
