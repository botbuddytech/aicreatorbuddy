import { redirect } from "next/navigation";

export default function LegacySchedulerCalendarRedirect() {
  redirect("/dashboard/videoscheduler");
}
