"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { LibraryToolbar } from "@/components/dashboard/library/LibraryToolbar";
import { VideoCard } from "@/components/dashboard/library/VideoCard";
import { VideoListRow } from "@/components/dashboard/library/LibraryListRow";
import {
  downloadCsv,
  filterVideos,
  libraryVideos,
  videoStatusCounts,
  videosToCsv,
  type LibraryViewMode,
  type VideoLibraryStatus,
} from "@/lib/contentLibrary";

function videoStatusFromRoute(pathname: string, published: string | null): VideoLibraryStatus | "all" {
  if (pathname.endsWith("/drafts")) return "draft";
  if (pathname.endsWith("/scheduled")) return "scheduled";
  if (published === "published") return "published";
  return "all";
}

export function VideoLibraryView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = videoStatusFromRoute(pathname, searchParams.get("status"));
  const [query, setQuery] = useState("");
  const [channelId, setChannelId] = useState("all");
  const [viewMode, setViewMode] = useState<LibraryViewMode>("grid");

  const counts = videoStatusCounts(libraryVideos);
  const videos = useMemo(
    () => filterVideos(libraryVideos, { status, query, channelId }),
    [status, query, channelId],
  );

  const chips = [
    {
      id: "all",
      label: "All",
      href: "/dashboard/library",
      count: counts.all,
      icon: <CameraIcon />,
    },
    {
      id: "published",
      label: "Published",
      href: "/dashboard/library?status=published",
      count: counts.published,
      icon: <CheckIcon />,
    },
    {
      id: "draft",
      label: "Draft",
      href: "/dashboard/library/drafts",
      count: counts.draft,
      icon: <DocIcon />,
    },
    {
      id: "scheduled",
      label: "Scheduled",
      href: "/dashboard/library/scheduled",
      count: counts.scheduled,
      icon: <ClockIcon />,
    },
  ];

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
        onExport={() => downloadCsv("library-videos.csv", videosToCsv(videos))}
        searchPlaceholder="Search videos…"
      />

      {videos.length === 0 ? (
        <EmptyState
          title="No videos match"
          description="Try another search, channel, or status filter."
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((video) => (
            <VideoListRow key={video.id} video={video} />
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
      <path d="M14 2v6h6" />
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
