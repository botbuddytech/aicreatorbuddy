import { Suspense } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { VideoLibraryView } from "@/components/dashboard/library/VideoLibraryView";

export default function LibraryScheduledPage() {
  return (
    <>
      <Topbar title="Content Library" subtitle="Videos queued to go live" />
      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <Suspense fallback={<p className="text-sm text-muted">Loading scheduled videos…</p>}>
          <VideoLibraryView />
        </Suspense>
      </div>
    </>
  );
}
