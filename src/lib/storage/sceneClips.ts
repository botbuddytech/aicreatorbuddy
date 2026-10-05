import "server-only";

import { createClient } from "@supabase/supabase-js";
import { SCENE_CLIP_BUCKET } from "@/lib/storage/sceneClipPath";

function storageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("Clip storage is not configured.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function uploadSceneClip(input: {
  path: string;
  bytes: Buffer;
  contentType: string;
}): Promise<string> {
  const supabase = storageClient();
  const { error } = await supabase.storage.from(SCENE_CLIP_BUCKET).upload(input.path, input.bytes, {
    contentType: input.contentType,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(SCENE_CLIP_BUCKET).getPublicUrl(input.path);
  return data.publicUrl;
}

export async function deleteSceneClip(path: string): Promise<void> {
  const supabase = storageClient();
  const { error } = await supabase.storage.from(SCENE_CLIP_BUCKET).remove([path]);
  if (!error) return;
  const message = error.message.toLowerCase();
  if (message.includes("not found") || message.includes("does not exist")) return;
  throw new Error(error.message);
}
