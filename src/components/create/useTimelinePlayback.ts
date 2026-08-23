"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  sceneRuntimeSeconds,
  totalTimelineSeconds,
  type Scene,
} from "@/lib/videoProject";

export type ActiveClip = {
  scene: Scene;
  index: number;
  start: number;
  duration: number;
  end: number;
};

export function activeSceneAt(scenes: Scene[], elapsed: number): ActiveClip | null {
  if (scenes.length === 0) return null;
  let start = 0;
  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index];
    if (!scene) continue;
    const duration = sceneRuntimeSeconds(scene);
    const end = start + duration;
    if (elapsed < end || index === scenes.length - 1) {
      return { scene, index, start, duration, end };
    }
    start = end;
  }
  return null;
}

export function useTimelinePlayback(scenes: Scene[]) {
  const total = Math.max(totalTimelineSeconds(scenes), 0);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    elapsedRef.current = Math.min(elapsedRef.current, total);
    setElapsed(elapsedRef.current);
  }, [total]);

  useEffect(() => {
    if (!playing || total <= 0) return;
    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const next = Math.min(total, elapsedRef.current + (now - last) / 1000);
      last = now;
      elapsedRef.current = next;
      setElapsed(next);
      if (next >= total) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, total]);

  const active = useMemo(() => activeSceneAt(scenes, elapsed), [scenes, elapsed]);
  const progress = total > 0 ? Math.min(elapsed / total, 1) : 0;

  function seek(seconds: number) {
    const next = Math.max(0, Math.min(total, seconds));
    elapsedRef.current = next;
    setElapsed(next);
    if (next >= total) setPlaying(false);
  }

  function toggle() {
    if (total <= 0) return;
    if (elapsedRef.current >= total) {
      elapsedRef.current = 0;
      setElapsed(0);
    }
    setPlaying((value) => !value);
  }

  function restart() {
    elapsedRef.current = 0;
    setElapsed(0);
    setPlaying(true);
  }

  return {
    playing,
    elapsed,
    total,
    active,
    progress,
    seek,
    toggle,
    restart,
    setPlaying,
  };
}
