import { CreateProjectClient } from "@/components/create/CreateProjectClient";
import { listChannels, type ConnectedChannel } from "@/lib/youtube/repo";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function CreateProjectPage({ params }: PageProps) {
  const { projectId } = await params;

  let channels: ConnectedChannel[] = [];
  try {
    channels = await listChannels();
  } catch (err) {
    console.error("[create] failed to load channels", err);
  }

  if (!projectId) {
    return <CreateProjectClient projectId="" channels={channels} />;
  }

  return <CreateProjectClient projectId={projectId} channels={channels} />;
}
