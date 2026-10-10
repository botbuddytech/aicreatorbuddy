import { CreateProjectClient } from "@/components/create/CreateProjectClient";
import { requireUser } from "@/lib/auth/session";
import { llmIntegrationAvailability } from "@/lib/integrations/llmAvailability";
import { listUserIntegrations } from "@/lib/integrations/repo";
import { listChannels, type ConnectedChannel } from "@/lib/youtube/repo";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function CreateProjectPage({ params }: PageProps) {
  const user = await requireUser();
  const { projectId } = await params;

  let channels: ConnectedChannel[] = [];
  let llmAvailability = { chatgpt: false, gemini: false };
  try {
    channels = await listChannels(user);
  } catch (err) {
    console.error("[create] failed to load channels", err);
  }
  try {
    llmAvailability = llmIntegrationAvailability(await listUserIntegrations(user.id));
  } catch (err) {
    console.error("[create] failed to load integrations", err);
  }

  if (!projectId) {
    return (
      <CreateProjectClient projectId="" channels={channels} llmAvailability={llmAvailability} />
    );
  }

  return (
    <CreateProjectClient
      projectId={projectId}
      channels={channels}
      llmAvailability={llmAvailability}
    />
  );
}
