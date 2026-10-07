import { Suspense } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { LibraryPlaylistData } from "@/components/dashboard/library/LibraryData";
import { VideoGridSkeleton } from "@/components/ui/skeletons/VideoGridSkeleton";

export default function LibraryPlaylistsPage() {
  return (
    <>
      <Topbar title="Content Library" subtitle="Collections and series across channels" />
      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <Suspense fallback={<VideoGridSkeleton label="Loading playlists" />}>
          <LibraryPlaylistData />
        </Suspense>
      </div>
    </>
  );
}
