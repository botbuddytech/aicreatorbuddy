import { redirect } from "next/navigation";
import { ActiveChannelPicker } from "@/components/dashboard/ActiveChannelPicker";
import { OverviewDashboard } from "@/components/dashboard/OverviewDashboard";
import { getSessionUser } from "@/lib/auth/session";
import { resolveActiveChannelId } from "@/lib/youtube/activeChannel";
import { loadOverview } from "@/lib/youtube/present";
import { listChannels, type ConnectedChannel } from "@/lib/youtube/repo";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const user = await getSessionUser();
  if (!user) redirect("/api/auth/clear-session");
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
      <OverviewDashboard initial={await loadOverview(user, "all").catch((err) => {
        console.error("[dashboard] youtube overview failed", err);
        return {
          channel: null,
          analyticsError: "YouTube data could not be loaded.",
          monetaryAvailable: false,
          primary: [],
          secondary: [],
          traffic: [],
          countries: [],
          uploads: [],
          scheduled: [],
          series: {
            views: { labels: [], values: [] },
            engagement: { labels: [], values: [] },
            revenue: { labels: [], values: [] },
          },
          audience: { primary: null, segments: [] },
        };
      })} />
    </>
  );
}
