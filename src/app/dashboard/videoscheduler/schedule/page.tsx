import { ScheduleVideoWizard } from "@/components/dashboard/scheduler/ScheduleVideoWizard";
import { requireUser } from "@/lib/auth/session";
import { listScheduleCandidates } from "@/lib/scheduler/candidates";
import { resolveActiveChannelId } from "@/lib/youtube/activeChannel";
import { listChannels, type ConnectedChannel } from "@/lib/youtube/repo";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ sessionId?: string; publishAt?: string }> };

export default async function ScheduleVideoPage({ searchParams }: PageProps) {
  const { sessionId: initialSessionId, publishAt: initialPublishAtIso } = await searchParams;
  const user = await requireUser();
  let channels: ConnectedChannel[] = [];
  let activeChannelId: string | null = null;
  try {
    channels = await listChannels(user);
    activeChannelId = await resolveActiveChannelId(user, channels);
    if (!activeChannelId && channels[0]) {
      activeChannelId = channels[0].id;
    }
  } catch (err) {
    console.error("[videoscheduler/schedule] failed to load channels", err);
  }
  const candidates = await listScheduleCandidates(user.id, activeChannelId);

  return (
    <ScheduleVideoWizard
      candidates={candidates}
      channels={channels}
      activeChannelId={activeChannelId}
      initialSessionId={initialSessionId ?? null}
      initialPublishAtIso={initialPublishAtIso ?? null}
    />
  );
}
