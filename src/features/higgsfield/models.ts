export type HiggsfieldModelId =
  | "kling-3-pro"
  | "kling-3-standard"
  | "kling-2-6-pro"
  | "seedance-2";

export type HiggsfieldVideoModel = {
  id: HiggsfieldModelId;
  label: string;
  endpoint: string;
  minDuration: number;
  maxDuration: number;
  /** When set, the request must use one of these exact lengths. */
  allowedDurations: number[] | null;
  mute: "sound-off" | "no-audio";
};

export const HIGGSFIELD_VIDEO_MODELS: readonly HiggsfieldVideoModel[] = [
  {
    id: "kling-3-pro",
    label: "Kling 3.0 Pro",
    endpoint: "kling-video/v3.0/pro/text-to-video",
    minDuration: 3,
    maxDuration: 15,
    allowedDurations: null,
    mute: "sound-off",
  },
  {
    id: "kling-3-standard",
    label: "Kling 3.0 Standard",
    endpoint: "kling-video/v3.0/std/text-to-video",
    minDuration: 3,
    maxDuration: 15,
    allowedDurations: null,
    mute: "sound-off",
  },
  {
    id: "kling-2-6-pro",
    label: "Kling 2.6 Pro",
    endpoint: "kling-video/v2.6/pro/text-to-video",
    minDuration: 5,
    maxDuration: 10,
    allowedDurations: [5, 10],
    mute: "sound-off",
  },
  {
    id: "seedance-2",
    label: "Seedance 2.0",
    endpoint: "bytedance/seedance-2.0/text-to-video",
    minDuration: 4,
    maxDuration: 15,
    allowedDurations: null,
    mute: "no-audio",
  },
];

export function higgsfieldModel(id: string | null | undefined): HiggsfieldVideoModel {
  return HIGGSFIELD_VIDEO_MODELS.find((model) => model.id === id) ?? HIGGSFIELD_VIDEO_MODELS[0];
}

export function higgsfieldDurationFor(
  model: HiggsfieldVideoModel,
  seconds: number,
): { duration: number; capped: boolean } {
  const rounded = Number.isFinite(seconds) ? Math.round(seconds) : model.minDuration;
  if (model.allowedDurations) {
    const duration = model.allowedDurations.reduce((best, value) =>
      Math.abs(value - rounded) < Math.abs(best - rounded) ? value : best,
    );
    return { duration, capped: duration !== rounded };
  }
  const duration = Math.min(model.maxDuration, Math.max(model.minDuration, rounded));
  return { duration, capped: duration !== rounded };
}

export function higgsfieldJobInput(
  model: HiggsfieldVideoModel,
  input: { prompt: string; duration: number; aspectRatio: "16:9" | "9:16" },
): Record<string, unknown> {
  if (model.mute === "no-audio") {
    return {
      prompt: input.prompt,
      duration: input.duration,
      aspect_ratio: input.aspectRatio,
      resolution: "720p",
      generate_audio: false,
    };
  }
  return {
    prompt: input.prompt,
    duration: input.duration,
    sound: "off",
    aspect_ratio: input.aspectRatio,
  };
}
