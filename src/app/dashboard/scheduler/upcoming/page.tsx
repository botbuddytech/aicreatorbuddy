import { redirect } from "next/navigation";

export default function LegacyUpcomingRedirect() {
  redirect("/dashboard/videoscheduler/upcoming");
}
