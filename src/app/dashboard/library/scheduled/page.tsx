import { Suspense } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { VideoLibraryView } from "@/components/dashboard/library/VideoLibraryView";
import { VideoGridSkeleton } from "@/components/ui/skeletons/VideoGridSkeleton";

export default function LibraryScheduledPage() {
  return (
    <>
      <Topbar title="Content Library" subtitle="Videos queued to go live" />
      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <Suspense fallback={<VideoGridSkeleton label="Loading scheduled videos" />}>
          <VideoLibraryView />
        </Suspense>
      </div>
    </>
  );
}
