import { Suspense } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { VideoLibraryView } from "@/components/dashboard/library/VideoLibraryView";

export default function LibraryPage() {
  return (
    <>
      <Topbar title="Content Library" subtitle="Every video across your workspace" />
      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <Suspense fallback={<LibraryFallback />}>
          <VideoLibraryView />
        </Suspense>
      </div>
    </>
  );
}

function LibraryFallback() {
  return <p className="text-sm text-muted">Loading library…</p>;
}
