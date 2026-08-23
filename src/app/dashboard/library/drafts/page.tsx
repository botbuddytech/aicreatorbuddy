import { Suspense } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { VideoLibraryView } from "@/components/dashboard/library/VideoLibraryView";
import { VideoGridSkeleton } from "@/components/ui/skeletons/VideoGridSkeleton";

export default function LibraryDraftsPage() {
  return (
    <>
      <Topbar title="Content Library" subtitle="Drafts waiting to be finished" />
      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <Suspense fallback={<VideoGridSkeleton label="Loading drafts" />}>
          <VideoLibraryView />
        </Suspense>
      </div>
    </>
  );
}
