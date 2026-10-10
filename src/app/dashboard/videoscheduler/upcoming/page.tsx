import { Topbar } from "@/components/dashboard/Topbar";
import { ScheduleVideoLink } from "@/components/dashboard/scheduler/ScheduleVideoLink";
import { UpcomingUploadsSection } from "@/components/dashboard/scheduler/UpcomingUploadsSection";
import { requireUser } from "@/lib/auth/session";
import { listReadyToPublish } from "@/lib/scheduler/candidates";
import { resolveActiveChannelId } from "@/lib/youtube/activeChannel";
import { listChannels } from "@/lib/youtube/repo";
import { loadScheduler } from "@/lib/youtube/present";

export default async function UpcomingUploadsPage() {
  const user = await requireUser();
  const schedule = await loadScheduler(user);
  let readyProjects: Awaited<ReturnType<typeof listReadyToPublish>> = [];
  let channels: Awaited<ReturnType<typeof listChannels>> = [];
  let activeChannelId: string | null = null;
  try {
    channels = await listChannels(user);
    activeChannelId = await resolveActiveChannelId(user, channels);
    readyProjects = await listReadyToPublish(user.id, activeChannelId);
  } catch (err) {
    console.error("[scheduler/upcoming] failed to load ready projects", err);
  }
  return (
    <>
      <Topbar
        title="Upcoming Uploads"
        subtitle="Plan and schedule your video uploads"
        actions={<ScheduleVideoLink label="Schedule New" />}
      />
      <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        <UpcomingUploadsSection
          upcomingCards={schedule.upcomingCards}
          nextUploadOffsetMs={schedule.nextUploadOffsetMs}
          uploads={schedule.uploads}
          scheduledVideoIds={schedule.scheduledVideoIds}
          readyProjects={readyProjects}
          channels={channels.map((channel) => ({
            id: channel.id,
            title: channel.title,
            status: channel.status,
          }))}
          activeChannelId={activeChannelId}
        />
      </div>
    </>
  );
}
