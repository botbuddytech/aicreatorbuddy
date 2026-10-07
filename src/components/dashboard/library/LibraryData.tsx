import { requireUser } from "@/lib/auth/session";
import { PlaylistLibraryView } from "@/components/dashboard/library/PlaylistLibraryView";
import { VideoLibraryView } from "@/components/dashboard/library/VideoLibraryView";
import { loadLibrary } from "@/lib/youtube/present";

export async function LibraryVideoData() {
  const library = await loadLibrary(await requireUser());
  return <VideoLibraryView videos={library.videos} channels={library.channels} />;
}

export async function LibraryPlaylistData() {
  const library = await loadLibrary(await requireUser());
  return <PlaylistLibraryView playlists={library.playlists} channels={library.channels} />;
}
