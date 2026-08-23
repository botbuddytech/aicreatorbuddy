import { Suspense } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { PlaylistLibraryView } from "@/components/dashboard/library/PlaylistLibraryView";

export default function LibraryPlaylistsPage() {
  return (
    <>
      <Topbar title="Content Library" subtitle="Collections and series across channels" />
      <div className="px-6 py-6">
        <Suspense fallback={<p className="text-sm text-muted">Loading playlists…</p>}>
          <PlaylistLibraryView />
        </Suspense>
      </div>
    </>
  );
}
