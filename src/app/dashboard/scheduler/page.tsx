import Link from "next/link";
import { Topbar } from "@/components/dashboard/Topbar";
import { BarList } from "@/components/dashboard/BarList";
import { ContentCalendar } from "@/components/dashboard/scheduler/ContentCalendar";
import { SchedulerStatCard } from "@/components/dashboard/scheduler/SchedulerStatCard";
import { UpcomingPanel } from "@/components/dashboard/scheduler/UpcomingPanel";
import { requireUser } from "@/lib/auth/session";
import { loadScheduler } from "@/lib/youtube/present";

function ScheduleVideoLink({ label }: { label: string }) {
  return (
    <Link
      href="/dashboard/create"
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark sm:w-auto"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12h14" />
      </svg>
      {label}
    </Link>
  );
}

export default async function SchedulerCalendarPage() {
  const schedule = await loadScheduler(await requireUser());
  return (
    <>
      <Topbar
        title="Content Calendar"
        subtitle={schedule.channelTitle ? `Schedule for ${schedule.channelTitle}` : "Connect a channel to see scheduled videos"}
        actions={<ScheduleVideoLink label="Schedule Video" />}
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
