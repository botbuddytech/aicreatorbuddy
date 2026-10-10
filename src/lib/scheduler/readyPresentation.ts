type TitlePayload = {
  titles?: { id?: string; text?: string }[];
  selectedTitleId?: string | null;
};

type ThumbnailPayload = {
  thumbnails?: { id?: string; customUrl?: string }[];
  selectedThumbnailId?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function selectedPublishTitle(data: unknown, payload: unknown): string | null {
  const metrics = asRecord(data);
  const fromMetrics = metrics?.selectedTitle;
  if (typeof fromMetrics === "string" && fromMetrics.trim()) return fromMetrics.trim();

  const body = asRecord(payload) as TitlePayload | null;
  const selected = body?.titles?.find((title) => title.id && title.id === body.selectedTitleId);
  const text = selected?.text?.trim();
  return text || null;
}

export function selectedThumbnailUrl(payload: unknown): string | null {
  const body = asRecord(payload) as ThumbnailPayload | null;
  const thumbs = body?.thumbnails ?? [];
  const selected =
    thumbs.find((thumb) => thumb.id && thumb.id === body?.selectedThumbnailId) ??
    thumbs.find((thumb) => thumb.customUrl?.trim());
  const url = selected?.customUrl?.trim();
  return url || null;
}
