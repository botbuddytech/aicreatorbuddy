import { higgsfieldModel } from "@/features/higgsfield/models";

/** Kling 3.0 Pro text-to-video accepts integer durations from 3 to 15 seconds. */
export const HIGGSFIELD_MIN_DURATION = 3;
export const HIGGSFIELD_MAX_DURATION = 15;

export const HIGGSFIELD_TEXT_TO_VIDEO = higgsfieldModel("kling-3-pro").endpoint;

export function higgsfieldDuration(seconds: number): { duration: number; capped: boolean } {
  const model = higgsfieldModel("kling-3-pro");
  const rounded = Number.isFinite(seconds) ? Math.round(seconds) : model.minDuration;
  const duration = Math.min(model.maxDuration, Math.max(model.minDuration, rounded));
  return { duration, capped: duration !== rounded };
}

export function higgsfieldAspect(value: string): "16:9" | "9:16" {
  return value === "9:16" ? "9:16" : "16:9";
}

export function higgsfieldDurationNote(sceneSeconds: number, sentSeconds: number): string | null {
  if (sentSeconds === Math.round(sceneSeconds)) return null;
  return `This scene is ${Math.round(sceneSeconds)}s. Higgsfield generates ${sentSeconds}s for this model.`;
}
