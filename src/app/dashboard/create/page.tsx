import { CreateIndexClient } from "@/components/create/CreateIndexClient";
import { listChannels, type ConnectedChannel } from "@/lib/youtube/repo";

export const dynamic = "force-dynamic";

export default async function CreateIndexPage() {
  let channels: ConnectedChannel[] = [];
  try {
    channels = await listChannels();
  } catch (err) {
    console.error("[create] failed to load channels", err);
  }

  return <CreateIndexClient channels={channels} />;
}
