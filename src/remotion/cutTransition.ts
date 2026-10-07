import type { CSSProperties } from "react";
import type { TransitionId } from "@/lib/videoProject";

export function transitionSpanFrames(
  durationSeconds: number,
  transitionSeconds: number,
  fps: number,
): number {
  const duration = Math.max(1, Math.round(Math.max(0, durationSeconds) * fps));
  const requested = Math.round(Math.max(0, transitionSeconds) * fps);
  return Math.min(requested, Math.max(0, duration - 1));
}

/** 0 on the first frame, 1 as the entrance finishes. Null once the clip is fully in. */
export function entranceProgress(frame: number, spanFrames: number): number | null {
  if (spanFrames <= 0 || frame >= spanFrames) return null;
  if (spanFrames === 1) return 0;
  return Math.min(1, frame / (spanFrames - 1));
}

/** 0 at the first frame of the exit, 1 at the cut. Null before the exit starts. */
export function cutProgress(
  frame: number,
  durationFrames: number,
  spanFrames: number,
): number | null {
  if (spanFrames <= 0) return null;
  const start = durationFrames - spanFrames;
  if (frame < start) return null;
  if (spanFrames === 1) return 1;
  return Math.min(1, (frame - start) / (spanFrames - 1));
}

function smooth(progress: number): number {
  return progress * progress * (3 - 2 * progress);
}

export function leaveStyle(type: TransitionId, progress: number): CSSProperties {
  const p = type === "dissolve" ? smooth(progress) : progress;
  switch (type) {
    case "fade":
    case "dissolve":
      return { opacity: 1 - p };
    case "slide":
      return { transform: `translateX(${-p * 100}%)` };
    case "wipe":
      return { clipPath: `inset(0 0 0 ${p * 100}%)` };
    case "zoom":
      return { opacity: 1 - p, transform: `scale(${1 + p * 0.2})` };
    default:
      return {};
  }
}

export function enterStyle(type: TransitionId, progress: number): CSSProperties {
  const p = type === "dissolve" ? smooth(progress) : progress;
  switch (type) {
    case "fade":
    case "dissolve":
      return { opacity: p };
    case "slide":
      return { transform: `translateX(${(1 - p) * 100}%)` };
    case "wipe":
      return { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` };
    case "zoom":
      return { opacity: p, transform: `scale(${1.15 - p * 0.15})` };
    default:
      return { opacity: 0 };
  }
}
