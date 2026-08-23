import { Topbar } from "@/components/dashboard/Topbar";
import { VideoPlayerSkeleton } from "@/components/ui/skeletons/VideoPlayerSkeleton";

export default function CreateProjectLoading() {
  return (
    <div className="skeleton-screen">
      <Topbar title="Create Video" subtitle="Loading draft…" />
      <VideoPlayerSkeleton label="Loading video workspace" />
    </div>
  );
}
