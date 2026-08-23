"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { LibraryToolbar } from "@/components/dashboard/library/LibraryToolbar";
import { PlaylistCard } from "@/components/dashboard/library/PlaylistCard";
import { PlaylistListRow } from "@/components/dashboard/library/LibraryListRow";
import {
  downloadCsv,
  filterPlaylists,
  libraryPlaylists,
  playlistsToCsv,
  playlistStatusCounts,
  type LibraryPlaylist,
  type LibraryViewMode,
  type PlaylistLibraryStatus,
} from "@/lib/contentLibrary";

const playlistStatuses = new Set<PlaylistLibraryStatus>(["ready", "editing", "review"]);

function playlistStatusFromQuery(value: string | null): PlaylistLibraryStatus | "all" {
  if (value && playlistStatuses.has(value as PlaylistLibraryStatus)) {
    return value as PlaylistLibraryStatus;
  }
  return "all";
}

export function PlaylistLibraryView() {
  const searchParams = useSearchParams();
  const status = playlistStatusFromQuery(searchParams.get("status"));
  const [query, setQuery] = useState("");
  const [channelId, setChannelId] = useState("all");
  const [viewMode, setViewMode] = useState<LibraryViewMode>("grid");
  const [playlists, setPlaylists] = useState<LibraryPlaylist[]>(libraryPlaylists);

  const counts = playlistStatusCounts(playlists);
  const visible = useMemo(
    () => filterPlaylists(playlists, { status, query, channelId }),
    [playlists, status, query, channelId],
  );

  const chips = [
    {
      id: "all",
      label: "All",
      href: "/dashboard/library/playlists",
      count: counts.all,
      icon: <CameraIcon />,
    },
    {
      id: "ready",
      label: "Ready",
      href: "/dashboard/library/playlists?status=ready",
      count: counts.ready,
      icon: <CheckIcon />,
    },
    {
      id: "editing",
      label: "Editing",
      href: "/dashboard/library/playlists?status=editing",
      count: counts.editing,
      icon: <DocIcon />,
    },
    {
      id: "review",
      label: "Review",
      href: "/dashboard/library/playlists?status=review",
      count: counts.review,
      icon: <ClockIcon />,
    },
  ];

  function removePlaylist(id: string) {
    setPlaylists((current) => current.filter((playlist) => playlist.id !== id));
  }

  return (
    <div className="space-y-6">
      <LibraryToolbar
        chips={chips}
        activeId={status}
        query={query}
        onQueryChange={setQuery}
        channelId={channelId}
        onChannelIdChange={setChannelId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onExport={() => downloadCsv("library-playlists.csv", playlistsToCsv(visible))}
        searchPlaceholder="Search playlists…"
      />

      {visible.length === 0 ? (
        <EmptyState
          title="No playlists match"
          description="Try another search, channel, or production status."
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              onDelete={() => removePlaylist(playlist.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((playlist) => (
            <PlaylistListRow
              key={playlist.id}
              playlist={playlist}
              onDelete={() => removePlaylist(playlist.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 10l4.55-2.27A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.89L15 14" />
      <rect x="3" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l3 3 5-6" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13l-3.5 3.5L11 15" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
