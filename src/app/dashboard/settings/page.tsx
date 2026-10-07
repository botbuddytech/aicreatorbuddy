import { Topbar } from "@/components/dashboard/Topbar";
import { SettingsForm } from "@/components/dashboard/SettingsForm";
import { requireUser } from "@/lib/auth/session";
import { resolveActiveChannelId } from "@/lib/youtube/activeChannel";
import { listChannels } from "@/lib/youtube/repo";

export default async function SettingsPage() {
  const user = await requireUser();
  const channels = await listChannels(user).catch(() => []);
  const activeChannelId = await resolveActiveChannelId(user, channels).catch(() => null);
  return (
    <>
      <Topbar title="Profile settings" subtitle="Account preferences for your workspace" />
      <SettingsForm
        channels={channels.map((channel) => ({ id: channel.id, title: channel.title }))}
        activeChannelId={activeChannelId}
      />
    </>
  );
}
