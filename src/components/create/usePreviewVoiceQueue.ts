"use client";

import { useEffect, useState } from "react";
import { qwenAudioReady, qwenAudioUrl, qwenCachedSceneIds } from "@/features/qwen/client";
import { measureAudioSeconds, spokenVoiceoverText } from "@/lib/sceneVoiceover";
import type { Scene } from "@/lib/videoProject";

export type VoiceBufferStatus = "generating" | "ready" | "error";

function needsVoice(scene: Scene | undefined) {
  return Boolean(scene && spokenVoiceoverText(scene.finalScript));
}

function slot(voiceId: string, sceneId: string) {
  return `${voiceId}\0${sceneId}`;
}

function initialStatus(scenes: Scene[], voiceId: string): Record<string, VoiceBufferStatus> {
  const next: Record<string, VoiceBufferStatus> = {};
  for (const scene of scenes) {
    const text = spokenVoiceoverText(scene.finalScript);
    if (text && qwenAudioReady(text, voiceId)) next[slot(voiceId, scene.id)] = "ready";
  }
  return next;
}

/**
 * Speaks the scene on screen first, then keeps going through the rest of the video.
 * One scene at a time. When it finishes, the next unfinished scene starts.
 * The cut still waits at a scene boundary until that scene's voice is ready.
 */
export function usePreviewVoiceQueue(
  scenes: Scene[],
  activeIndex: number,
  voiceId: string,
  enabled: boolean,
  onMeasured?: (sceneId: string, seconds: number) => void,
) {
  const [status, setStatus] = useState<Record<string, VoiceBufferStatus>>(() =>
    initialStatus(scenes, voiceId),
  );

  useEffect(() => {
    if (!enabled) return;
    const lines = scenes.flatMap((scene) => {
      const text = spokenVoiceoverText(scene.finalScript);
      return text ? [{ id: scene.id, text }] : [];
    });
    if (lines.length === 0) return;
    let cancelled = false;
    void qwenCachedSceneIds(voiceId, lines)
      .then((ids) => {
        if (cancelled || ids.length === 0) return;
        const readyIds = new Set(ids);
        setStatus((currentStatusMap) => {
          const next = { ...currentStatusMap };
          let changed = false;
          for (const line of lines) {
            if (!readyIds.has(line.id)) continue;
            const key = slot(voiceId, line.id);
            if (next[key] === "ready") continue;
            next[key] = "ready";
            changed = true;
          }
          return changed ? next : currentStatusMap;
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled, scenes, voiceId]);

  useEffect(() => {
    if (!enabled) return;
    const unfinished = (scene: Scene | undefined) => {
      if (!needsVoice(scene) || !scene) return false;
      const state = status[slot(voiceId, scene.id)];
      return state !== "ready" && state !== "generating" && state !== "error";
    };
    if (scenes.some((scene) => status[slot(voiceId, scene.id)] === "generating")) return;

    const active = scenes[activeIndex];
    const target = unfinished(active) ? active : scenes.find((scene) => unfinished(scene));
    if (!target) return;

    const targetKey = slot(voiceId, target.id);
    const text = spokenVoiceoverText(target.finalScript);
    const timer = window.setTimeout(() => {
      if (qwenAudioReady(text, voiceId)) {
        setStatus((currentStatusMap) => ({ ...currentStatusMap, [targetKey]: "ready" }));
        return;
      }
      setStatus((currentStatusMap) => {
        if (currentStatusMap[targetKey] === "generating" || currentStatusMap[targetKey] === "ready") {
          return currentStatusMap;
        }
        return { ...currentStatusMap, [targetKey]: "generating" };
      });
      void qwenAudioUrl(text, voiceId)
        .then(async (url) => {
          const seconds = await measureAudioSeconds(url);
          if (seconds) onMeasured?.(target.id, seconds);
          setStatus((currentStatusMap) => ({ ...currentStatusMap, [targetKey]: "ready" }));
        })
        .catch(() => {
          setStatus((currentStatusMap) => ({ ...currentStatusMap, [targetKey]: "error" }));
        });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [enabled, scenes, activeIndex, voiceId, status, onMeasured]);

  function readyFor(scene: Scene | undefined) {
    if (!needsVoice(scene) || !scene) return true;
    const state = status[slot(voiceId, scene.id)];
    return state === "ready" || state === "error";
  }

  function statusFor(sceneId: string): VoiceBufferStatus | undefined {
    return status[slot(voiceId, sceneId)];
  }

  return { statusFor, readyFor };
}
