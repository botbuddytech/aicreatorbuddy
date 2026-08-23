import { Topbar } from "@/components/dashboard/Topbar";
import { VideoGridSkeleton } from "@/components/ui/skeletons/VideoGridSkeleton";

export default function CreateLoading() {
  return (
    <div className="skeleton-screen">
      <Topbar title="Create Video" subtitle="Loading drafts…" />
      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <VideoGridSkeleton count={6} variant="project" label="Loading drafts" />
      </div>
    </div>
  );
}
