import { CreateProjectClient } from "@/components/create/CreateProjectClient";
import { requireUser } from "@/lib/auth/session";
import { listChannels, type ConnectedChannel } from "@/lib/youtube/repo";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function CreateProjectPage({ params }: PageProps) {
  const user = await requireUser();
  const { projectId } = await params;

  let channels: ConnectedChannel[] = [];
  try {
    channels = await listChannels(user);
  } catch (err) {
    console.error("[create] failed to load channels", err);
  }

  if (!projectId) {
    return <CreateProjectClient projectId="" channels={channels} />;
  }

  return <CreateProjectClient projectId={projectId} channels={channels} />;
}
