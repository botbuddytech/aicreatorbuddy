import { ActiveChannelPicker } from "@/components/dashboard/ActiveChannelPicker";
import { OverviewDashboard } from "@/components/dashboard/OverviewDashboard";
import { requireUser } from "@/lib/auth/session";
import { resolveActiveChannelId } from "@/lib/youtube/activeChannel";
import { listChannels, type ConnectedChannel } from "@/lib/youtube/repo";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const user = await requireUser();
  let channels: ConnectedChannel[] = [];
  let activeChannelId: string | null = null;
  try {
    channels = await listChannels(user);
    activeChannelId = await resolveActiveChannelId(user, channels);
  } catch (err) {
    console.error("[dashboard] failed to load channels", err);
  }

  return (
    <>
      <section className="px-4 pt-5 sm:px-6 sm:pt-6">
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Select a channel
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          Video creation uses the channel selected here
        </p>
        <div className="mt-4">
          <ActiveChannelPicker channels={channels} activeChannelId={activeChannelId} />
        </div>
      </section>
      <OverviewDashboard />
    </>
  );
}
