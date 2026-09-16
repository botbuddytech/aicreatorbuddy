import { Topbar } from "@/components/dashboard/Topbar";
import { ChannelsView } from "@/components/dashboard/channels/ChannelsView";
import { requireUser } from "@/lib/auth/session";
import { listChannels, type ConnectedChannel } from "@/lib/youtube/repo";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function first(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function ChannelsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const connectedId = first(params.connected);
  const error = first(params.error);

  let channels: ConnectedChannel[] = [];
  let loadError: string | null = null;
  try {
    channels = await listChannels(user.id);
  } catch (err) {
    console.error("[channels] failed to load", err);
    loadError = "Could not reach the database. Check DATABASE_URL and try again.";
  }

  const connected = connectedId ? channels.find((c) => c.id === connectedId) ?? null : null;
  const notice = error
    ? ({ kind: "error", text: error } as const)
    : loadError
      ? ({ kind: "error", text: loadError } as const)
      : connected
        ? ({ kind: "success", text: `${connected.title} connected and synced.` } as const)
        : null;

  return (
    <>
      <Topbar
        title="YouTube Connections"
        subtitle="Link your channels and see profile, subscribers, and uploads at a glance"
      />
      <ChannelsView channels={channels} initialNotice={notice} />
    </>
  );
}
