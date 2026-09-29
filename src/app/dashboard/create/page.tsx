import { CreateIndexClient } from "@/components/create/CreateIndexClient";
import { requireUser } from "@/lib/auth/session";
import { resolveActiveChannelId } from "@/lib/youtube/activeChannel";
import { listChannels, type ConnectedChannel } from "@/lib/youtube/repo";

export const dynamic = "force-dynamic";

export default async function CreateIndexPage() {
  const user = await requireUser();
  let channels: ConnectedChannel[] = [];
  let activeChannelId: string | null = null;
  try {
    channels = await listChannels(user);
    activeChannelId = await resolveActiveChannelId(user, channels);
  } catch (err) {
    console.error("[create] failed to load channels", err);
  }

  return <CreateIndexClient channels={channels} activeChannelId={activeChannelId} />;
}
