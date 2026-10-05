export const SCENE_CLIP_BUCKET = "scene-clips";
export const SCENE_CLIP_MAX_BYTES = 100 * 1024 * 1024;

const CLIP_TYPES = new Map<string, string>([
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

const ID = /^[A-Za-z0-9_-]{8,80}$/;

export function extensionForSceneClip(type: string): string | null {
  return CLIP_TYPES.get(type) ?? null;
}

export function isSceneClipId(value: string): boolean {
  return ID.test(value);
}

export function sceneClipObjectPath(
  sessionId: string,
  sceneId: string,
  clipId: string,
  extension: string,
): string {
  return `${sessionId}/${sceneId}/${clipId}.${extension}`;
}

/** A storage path may only name a clip that belongs to this session and scene. */
export function isOwnedSceneClipPath(sessionId: string, sceneId: string, path: string): boolean {
  if (!isSceneClipId(sessionId) || !isSceneClipId(sceneId)) return false;
  if (path.includes("..") || path.includes("\\")) return false;
  const match = path.match(
    /^([A-Za-z0-9_-]{8,80})\/([A-Za-z0-9_-]{8,80})\/([A-Za-z0-9_-]{8,80})\.(mp4|webm|mov|jpg|png|webp|gif)$/,
  );
  return Boolean(match && match[1] === sessionId && match[2] === sceneId);
}
