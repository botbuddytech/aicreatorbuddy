export type UploadChannelRef = {
  id: string;
  status: string;
};

/**
 * Channel the YouTube upload should use.
 * A chosen id wins only when that channel is still connected and active.
 * Otherwise the dashboard's selected channel, then the first connected channel.
 */
export function pickUploadChannelId(input: {
  selectedChannelId?: string | null;
  projectChannelId?: string | null;
  activeChannelId?: string | null;
  channels: UploadChannelRef[];
}): string | null {
  const candidates = [input.selectedChannelId, input.projectChannelId, input.activeChannelId];
  if (input.channels.length === 0) {
    for (const raw of candidates) {
      const id = typeof raw === "string" ? raw.trim() : "";
      if (id) return id;
    }
    return null;
  }
  const connected = new Set(
    input.channels.filter((channel) => channel.status === "ACTIVE").map((channel) => channel.id),
  );
  for (const raw of candidates) {
    const id = typeof raw === "string" ? raw.trim() : "";
    if (id && connected.has(id)) return id;
  }
  return input.channels.find((channel) => channel.status === "ACTIVE")?.id ?? null;
}
