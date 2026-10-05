import "server-only";

import { createClient } from "@supabase/supabase-js";

export const THUMBNAIL_BUCKET = "thumbnails";
const MAX_BYTES = 5 * 1024 * 1024;

const IMAGE_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export function thumbnailObjectPath(sessionId: string, thumbnailId: string, extension: string): string {
  return `${sessionId}/${thumbnailId}.${extension}`;
}

export function extensionForImage(type: string): string | null {
  return IMAGE_TYPES.get(type) ?? null;
}

export function isThumbnailId(value: string): boolean {
  return /^[A-Za-z0-9_-]{8,80}$/.test(value);
}

function storageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("Thumbnail storage is not configured.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function uploadThumbnailImage(input: {
  sessionId: string;
  thumbnailId: string;
  bytes: Buffer;
  contentType: string;
}): Promise<string> {
  const extension = extensionForImage(input.contentType);
  if (!extension) throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
  if (input.bytes.byteLength === 0 || input.bytes.byteLength > MAX_BYTES) {
    throw new Error("Image must be under 5 MB.");
  }
  if (!isThumbnailId(input.thumbnailId)) throw new Error("Invalid thumbnail.");

  const path = thumbnailObjectPath(input.sessionId, input.thumbnailId, extension);
  const supabase = storageClient();
  const { error } = await supabase.storage.from(THUMBNAIL_BUCKET).upload(path, input.bytes, {
    contentType: input.contentType,
    upsert: true,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(THUMBNAIL_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
