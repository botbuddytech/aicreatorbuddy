import { randomUUID } from "crypto";

export type YoutubeUploadTransfer = {
  userId: string;
  uploadUrl: string;
  contentType: string;
  createdAt: number;
};

const TTL_MS = 60 * 60 * 1000;
const transfers = new Map<string, YoutubeUploadTransfer>();

function prune() {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, row] of transfers) {
    if (row.createdAt < cutoff) transfers.delete(id);
  }
}

export function createUploadTransfer(input: Omit<YoutubeUploadTransfer, "createdAt">): string {
  prune();
  const id = randomUUID();
  transfers.set(id, { ...input, createdAt: Date.now() });
  return id;
}

export function takeUploadTransfer(transferId: string, userId: string): YoutubeUploadTransfer | null {
  const row = transfers.get(transferId);
  if (!row || row.userId !== userId) return null;
  transfers.delete(transferId);
  return row;
}
