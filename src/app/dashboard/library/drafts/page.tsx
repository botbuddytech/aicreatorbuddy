import { Suspense } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { VideoLibraryView } from "@/components/dashboard/library/VideoLibraryView";

export default function LibraryDraftsPage() {
  return (
    <>
      <Topbar title="Content Library" subtitle="Drafts waiting to be finished" />
      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <Suspense fallback={<p className="text-sm text-muted">Loading drafts…</p>}>
          <VideoLibraryView />
        </Suspense>
      </div>
    </>
  );
}
