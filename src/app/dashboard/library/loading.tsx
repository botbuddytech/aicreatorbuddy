import { Topbar } from "@/components/dashboard/Topbar";
import { VideoGridSkeleton } from "@/components/ui/skeletons/VideoGridSkeleton";

export default function LibraryLoading() {
  return (
    <div className="skeleton-screen">
      <Topbar title="Content Library" subtitle="Loading your videos…" />
      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <VideoGridSkeleton />
      </div>
    </div>
  );
}
