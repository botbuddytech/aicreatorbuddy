import Link from "next/link";

export function ScheduleVideoLink({ label }: { label: string }) {
  return (
    <Link
      href="/dashboard/videoscheduler/schedule"
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark sm:w-auto"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12h14" />
      </svg>
      {label}
    </Link>
  );
}
