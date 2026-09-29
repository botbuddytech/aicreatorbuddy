import type { ReactNode } from "react";
import { MonetizationLayout } from "@/components/dashboard/monetization/MonetizationLayout";
import { requireUser } from "@/lib/auth/session";
import { resolveActiveChannelId } from "@/lib/youtube/activeChannel";
import { listChannels, type ConnectedChannel } from "@/lib/youtube/repo";

export default async function AnalyticsLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  let channel: ConnectedChannel | null = null;
  try {
    const channels = await listChannels(user);
    const activeChannelId = await resolveActiveChannelId(user, channels);
    channel = channels.find((item) => item.id === activeChannelId) ?? null;
  } catch (err) {
    console.error("[analytics] failed to load selected channel", err);
  }

  return <MonetizationLayout channel={channel}>{children}</MonetizationLayout>;
}
