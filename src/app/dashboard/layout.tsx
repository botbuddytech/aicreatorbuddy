import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/auth/session";
import { AuthSessionProvider } from "@/components/auth/AuthSessionProvider";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import {
  getActiveChannelBadge,
  type ActiveChannelBadge,
} from "@/lib/youtube/activeChannel";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  let activeChannel: ActiveChannelBadge | null = null;
  try {
    activeChannel = await getActiveChannelBadge(await requireUser());
  } catch (err) {
    console.error("[dashboard] failed to load selected channel", err);
  }

  return (
    <AuthSessionProvider session={session}>
      <DashboardShell activeChannel={activeChannel}>{children}</DashboardShell>
    </AuthSessionProvider>
  );
}
