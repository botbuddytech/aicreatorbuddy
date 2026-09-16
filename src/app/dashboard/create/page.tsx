import { CreateIndexClient } from "@/components/create/CreateIndexClient";
import { requireUser } from "@/lib/auth/session";
import { listChannels, type ConnectedChannel } from "@/lib/youtube/repo";

export const dynamic = "force-dynamic";

export default async function CreateIndexPage() {
  const user = await requireUser();
  let channels: ConnectedChannel[] = [];
  try {
    channels = await listChannels(user.id);
  } catch (err) {
    console.error("[create] failed to load channels", err);
  }

  return <CreateIndexClient channels={channels} />;
}
