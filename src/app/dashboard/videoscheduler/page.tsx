import { Topbar } from "@/components/dashboard/Topbar";
import { BarList } from "@/components/dashboard/BarList";
import { ContentCalendar } from "@/components/dashboard/scheduler/ContentCalendar";
import { ScheduleVideoLink } from "@/components/dashboard/scheduler/ScheduleVideoLink";
import { SchedulerStatCard } from "@/components/dashboard/scheduler/SchedulerStatCard";
import { UpcomingPanel } from "@/components/dashboard/scheduler/UpcomingPanel";
import { requireUser } from "@/lib/auth/session";
import { loadScheduler } from "@/lib/youtube/present";

export default async function SchedulerCalendarPage() {
  const schedule = await loadScheduler(await requireUser());
  return (
    <>
      <Topbar
        title="Content Calendar"
        subtitle={schedule.channelTitle ? `Schedule for ${schedule.channelTitle}` : "Connect a channel to see scheduled videos"}
        actions={<ScheduleVideoLink label="Video Scheduler" />}
      />
      <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {schedule.calendarCards.map((card) => (
            <SchedulerStatCard
              key={card.id}
              icon={card.icon}
              label={card.label}
              value={card.value}
              badge={card.badge}
            />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <ContentCalendar events={schedule.events} />
          <div className="space-y-6">
            <UpcomingPanel events={schedule.events} />
            <BarList
              title="Best Time to Post"
              badge={
                <span className="rounded-full bg-chart-purple/15 px-2 py-0.5 text-[11px] font-semibold text-chart-purple">
                  From uploads
                </span>
              }
              footer="Publish hour weighted by views. Times are UTC."
              items={schedule.bars}
              maxValue={100}
            />
          </div>
        </div>
      </div>
    </>
  );
}
