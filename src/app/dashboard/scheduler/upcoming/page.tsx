import Link from "next/link";
import { Topbar } from "@/components/dashboard/Topbar";
import { NextUpCountdown } from "@/components/dashboard/scheduler/NextUpCountdown";
import { SchedulerStatCard } from "@/components/dashboard/scheduler/SchedulerStatCard";
import { UpcomingUploadsBoard } from "@/components/dashboard/scheduler/UpcomingUploadsBoard";
import { nextUploadOffsetMs, upcomingUploadsStatCards } from "@/lib/dashboardContent";

export default function UpcomingUploadsPage() {
  return (
    <>
      <Topbar
        title="Upcoming Uploads"
        subtitle="Plan and schedule your video uploads"
        actions={
          <Link
            href="/dashboard/create"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Schedule New
          </Link>
        }
      />
      <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {upcomingUploadsStatCards.map((card) => (
            <SchedulerStatCard
              key={card.id}
              icon={card.icon}
              label={card.label}
              value={card.id === "next-up" ? <NextUpCountdown offsetMs={nextUploadOffsetMs} /> : card.value}
              badge={card.badge}
              sub={card.sub}
            />
          ))}
        </div>
        <UpcomingUploadsBoard />
      </div>
    </>
  );
}
