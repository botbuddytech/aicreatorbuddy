import { redirect } from "next/navigation";

export default function LegacyBestTimeRedirect() {
  redirect("/dashboard/videoscheduler/best-time");
}
