import { redirect } from "next/navigation";

export default function LegacyScheduleVideoRedirect() {
  redirect("/dashboard/videoscheduler/schedule");
}
