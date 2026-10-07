import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/auth/session";
import { AuthSessionProvider } from "@/components/auth/AuthSessionProvider";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import {
  getDashboardChannelNav,
  type DashboardChannelNav,
} from "@/lib/youtube/activeChannel";
import { countNavBadges } from "@/lib/youtube/present";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/clear-session");
  }

  let channelNav: DashboardChannelNav = { activeChannelId: null, channels: [] };
  let navCounts = { drafts: 0, upcoming: 0 };
  try {
    const user = await requireUser();
    channelNav = await getDashboardChannelNav(user);
    navCounts = await countNavBadges(user);
  } catch (err) {
    console.error("[dashboard] failed to load selected channel", err);
  }

  return (
    <AuthSessionProvider session={session}>
      <DashboardShell channelNav={channelNav} navCounts={navCounts}>{children}</DashboardShell>
    </AuthSessionProvider>
  );
}
