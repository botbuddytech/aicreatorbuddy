/** In-memory export held between schedule approval and upload on Upcoming (same tab). */
export type PendingScheduleUpload = {
  sessionId: string;
  channelId: string;
  title: string;
  description: string;
  tags: string[];
  publishAtIso: string;
  thumbnailUrl: string | null;
  file: { blob: Blob; fileName: string; mimeType: string };
};

const pendingBySession = new Map<string, PendingScheduleUpload>();

export function setPendingScheduleUpload(data: PendingScheduleUpload) {
  pendingBySession.set(data.sessionId, data);
}

export function getPendingScheduleUpload(sessionId: string): PendingScheduleUpload | null {
  return pendingBySession.get(sessionId) ?? null;
}

export function clearPendingScheduleUpload(sessionId: string) {
  pendingBySession.delete(sessionId);
}
