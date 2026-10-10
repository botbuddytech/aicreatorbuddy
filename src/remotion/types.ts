import type {
  AspectRatio,
  FilterId,
  TextOverlay,
  TransitionId,
  VideoFontId,
  VideoFontWeight,
} from "@/lib/videoProject";
import { transitionSpanFrames } from "@/remotion/cutTransition";

export const FACELESS_FPS = 30;

export type FacelessSceneProps = {
  id: string;
  sectionLabel: string;
  description: string;
  durationSeconds: number;
  trimStartSeconds: number;
  finalScript: string;
  filter: FilterId;
  volume: number;
  speed: number;
  transitionIn: TransitionId;
  transitionInSeconds: number;
  transition: TransitionId;
  transitionSeconds: number;
  textOverlay: TextOverlay | null;
  clipUrl: string | null;
  posterUrl: string | null;
  clipKind: "image" | "video" | null;
  /** Spoken voice for this scene. Null leaves the export without narration. */
  voiceoverUrl: string | null;
};

export type FacelessVideoProps = {
  aspectRatio: AspectRatio;
  captions: boolean;
  captionFontId: VideoFontId | null;
  captionFontWeight: VideoFontWeight;
  captionFontSize: number;
  scenes: FacelessSceneProps[];
};

export function compositionSize(aspectRatio: AspectRatio): {
  width: number;
  height: number;
} {
  return aspectRatio === "9:16"
    ? { width: 1080, height: 1920 }
    : { width: 1920, height: 1080 };
}

export function framesForSeconds(seconds: number): number {
  return Math.max(1, Math.round(Math.max(0, seconds) * FACELESS_FPS));
}

/** Unclamped variant: a zero trim must stay zero frames. */
export function framesFromSeconds(seconds: number): number {
  return Math.max(0, Math.round(Math.max(0, seconds) * FACELESS_FPS));
}

export function joinTransitionFrames(
  scene: FacelessSceneProps,
): number {
  if (scene.transition === "none") return 0;
  return transitionSpanFrames(
    scene.durationSeconds,
    scene.transitionSeconds,
    FACELESS_FPS,
  );
}

/** Total length with @remotion/transitions overlap between scenes. */
export function durationInFramesFromProps(props: FacelessVideoProps): number {
  if (props.scenes.length === 0) return FACELESS_FPS;
  let frames = 0;
  for (let index = 0; index < props.scenes.length; index += 1) {
    const scene = props.scenes[index];
    frames += framesForSeconds(scene.durationSeconds);
    if (index < props.scenes.length - 1) {
      frames -= joinTransitionFrames(scene);
    }
  }
  return Math.max(1, frames);
}
