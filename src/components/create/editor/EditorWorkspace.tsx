"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PlayerRef } from "@remotion/player";
import { EditorCanvas } from "@/components/create/editor/EditorCanvas";
import { EditorInspector } from "@/components/create/editor/EditorInspector";
import { EditorLeftRail, type EditorRailId } from "@/components/create/editor/EditorLeftRail";
import { EditorTimeline } from "@/components/create/editor/EditorTimeline";
import { ExportButton } from "@/components/create/ExportButton";
import { activeSceneAt } from "@/components/create/useTimelinePlayback";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { measureVideoSeconds } from "@/lib/clipPoster";
import { useSyncedSceneVoiceover } from "@/lib/sceneVoiceover";
import { useClipUrls } from "@/lib/useClipUrl";
import { sceneDuration, sceneRuntimeSeconds } from "@/lib/videoProject";
import {
  buildInputProps,
  FACELESS_FPS,
  playerCompositionMeta,
} from "@/remotion";

function round1(seconds: number) {
  return Math.round(seconds * 10) / 10;
}

export function EditorWorkspace() {
  const { project, dispatch } = useVideoProject();
  const [rail, setRail] = useState<EditorRailId>("assets");
  const [selectedId, setSelectedId] = useState(project.scenes[0]?.id ?? "");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerRef>(null);

  const clipIds = useMemo(
    () =>
      project.scenes
        .map((scene) => scene.visuals.uploadedClipId)
        .filter((id): id is string => Boolean(id)),
    [project.scenes],
  );
  const clipUrls = useClipUrls(clipIds);
  const inputProps = useMemo(
    () => buildInputProps(project, clipUrls),
    [project, clipUrls],
  );
  const meta = useMemo(() => playerCompositionMeta(inputProps), [inputProps]);
  const total = meta.durationInFrames / FACELESS_FPS;
  const active = activeSceneAt(project.scenes, elapsed);
  const [voiceUnlocked, setVoiceUnlocked] = useState(false);
  const [voiceSyncKey, setVoiceSyncKey] = useState(0);
  const sceneLocalSeconds = active ? Math.max(0, elapsed - active.start) : 0;

  const hasVoiceover =
    Boolean(active?.scene.finalScript.trim()) ||
    (active?.scene.voiceover.status === "ready" &&
      Boolean(active.scene.voiceover.audioUrl));

  // Same mapping as Timeline preview: speak this beat's script while Remotion plays,
  // re-locking to the playhead on seek / play / scene changes.
  useSyncedSceneVoiceover({
    scene: active?.scene ?? null,
    playing: playing && voiceUnlocked,
    enabled: Boolean(hasVoiceover),
    sceneLocalSeconds,
    syncKey: voiceSyncKey,
  });

  const selected =
    project.scenes.find((scene) => scene.id === selectedId) ?? project.scenes[0] ?? null;

  const [prevScenes, setPrevScenes] = useState(project.scenes);
  if (project.scenes !== prevScenes) {
    setPrevScenes(project.scenes);
    if (!project.scenes.some((scene) => scene.id === selectedId)) {
      setSelectedId(project.scenes[0]?.id ?? "");
    }
  }

  const activeSceneId = playing ? active?.scene.id : undefined;
  const [prevActiveSceneId, setPrevActiveSceneId] = useState(activeSceneId);
  if (activeSceneId !== prevActiveSceneId) {
    setPrevActiveSceneId(activeSceneId);
    if (activeSceneId) {
      setSelectedId(activeSceneId);
    }
  }

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onFrame = (event: { detail: { frame: number } }) => {
      setElapsed(event.detail.frame / FACELESS_FPS);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);

    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    player.addEventListener("ended", onEnded);
    return () => {
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("ended", onEnded);
    };
  }, [meta.durationInFrames, meta.compositionWidth, meta.compositionHeight]);

  // Clips uploaded before source length was recorded have no trim ceiling yet.
  // Measure them once, and pull back any scene already running past its footage.
  const measuredRef = useRef(new Set<string>());
  useEffect(() => {
    for (const scene of project.scenes) {
      const clipId = scene.visuals.uploadedClipId;
      if (
        !clipId ||
        scene.visuals.uploadedClipKind !== "video" ||
        scene.visuals.uploadedClipDurationSeconds !== null ||
        measuredRef.current.has(clipId)
      ) {
        continue;
      }
      const url = clipUrls[clipId];
      if (!url) continue;

      measuredRef.current.add(clipId);
      const sceneId = scene.id;
      const trimStart = scene.editing.trimStartSeconds;
      const duration = sceneDuration(scene);

      void measureVideoSeconds(url).then((seconds) => {
        if (!seconds) return;
        const overrun = duration + trimStart > seconds;
        dispatch({
          type: "PATCH_SCENE",
          id: sceneId,
          patch: {
            visuals: { uploadedClipDurationSeconds: seconds },
            ...(overrun
              ? { editing: { durationSeconds: Math.max(1, round1(seconds - trimStart)) } }
              : {}),
          },
        });
      });
    }
  }, [project.scenes, clipUrls, dispatch]);

  useEffect(() => {
    const node = workspaceRef.current;
    function onChange() {
      setIsFullscreen(document.fullscreenElement === node);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      if (document.fullscreenElement === node) {
        void document.exitFullscreen();
      }
    };
  }, []);

  async function toggleFullscreen() {
    const node = workspaceRef.current;
    if (!node) return;
    try {
      if (document.fullscreenElement === node) {
        await document.exitFullscreen();
      } else {
        await node.requestFullscreen();
      }
    } catch {
      /* unsupported */
    }
  }

  function seekSeconds(seconds: number) {
    const clamped = Math.max(0, Math.min(total, seconds));
    const frame = Math.round(clamped * FACELESS_FPS);
    playerRef.current?.seekTo(frame);
    setElapsed(clamped);
    if (clamped >= total) setPlaying(false);
    // Realign narration to wherever the playhead landed.
    if (voiceUnlocked) setVoiceSyncKey((value) => value + 1);
  }

  function togglePlay() {
    const player = playerRef.current;
    if (!player || total <= 0) return;
    // Play click is the user gesture speechSynthesis / VO audio need.
    setVoiceUnlocked(true);
    if (elapsed >= total - 0.05) {
      setVoiceSyncKey((value) => value + 1);
      player.seekTo(0);
      setElapsed(0);
      player.play();
      return;
    }
    // Only re-lock narration when starting playback, not when pausing.
    if (!playing) setVoiceSyncKey((value) => value + 1);
    player.toggle();
  }

  function restart() {
    const player = playerRef.current;
    if (!player) return;
    setVoiceUnlocked(true);
    setVoiceSyncKey((value) => value + 1);
    player.seekTo(0);
    setElapsed(0);
    player.play();
  }

  function splitAtPlayhead() {
    if (!active) return;
    const fraction =
      active.duration > 0 ? (elapsed - active.start) / active.duration : 0;
    const atSeconds = fraction * sceneDuration(active.scene);
    dispatch({ type: "SPLIT_SCENE", id: active.scene.id, atSeconds });
  }

  return (
    <div
      ref={workspaceRef}
      className={`flex min-h-[24rem] flex-col gap-2 rounded-2xl border border-border bg-background p-2 lg:min-h-[40rem] ${
        isFullscreen ? "h-screen w-screen overflow-auto p-3" : ""
      }`}
    >
      <div className="flex items-center justify-end gap-2 px-1">
        {isFullscreen ? <ExportButton size="sm" /> : null}
        <button
          type="button"
          title={isFullscreen ? "Exit full screen" : "Full screen"}
          aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
          onClick={toggleFullscreen}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-foreground"
        >
          {isFullscreen ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M9 4H5v4h2V6h2V4zm10 0h-4v2h2v2h2V4zM7 16H5v4h4v-2H7v-2zm12 0h-2v2h-2v2h4v-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M5 5h5v2H7v3H5V5zm9 0h5v5h-2V7h-3V5zM5 14h2v3h3v2H5v-5zm12 0h2v5h-5v-2h3v-3z" />
            </svg>
          )}
        </button>
      </div>
      <div className="grid min-h-0 flex-1 items-stretch gap-2 lg:grid-cols-[16.5rem_minmax(0,1fr)_13.5rem]">
        <EditorLeftRail rail={rail} onRail={setRail} scene={selected} />
        <EditorCanvas
          scene={selected}
          active={active}
          elapsed={elapsed}
          total={total}
          playing={playing}
          playerRef={playerRef}
          inputProps={inputProps}
          durationInFrames={meta.durationInFrames}
          compositionWidth={meta.compositionWidth}
          compositionHeight={meta.compositionHeight}
          onToggle={togglePlay}
          onRestart={restart}
          onSplit={splitAtPlayhead}
          onSeek={seekSeconds}
        />
        <EditorInspector scene={selected} />
      </div>
      <EditorTimeline
        scenes={project.scenes}
        selectedId={selected?.id ?? null}
        elapsed={elapsed}
        total={total}
        onSelect={(id) => {
          setSelectedId(id);
          const index = project.scenes.findIndex((scene) => scene.id === id);
          if (index < 0) return;
          let start = 0;
          for (let i = 0; i < index; i += 1) {
            const scene = project.scenes[i];
            if (scene) start += sceneRuntimeSeconds(scene);
          }
          seekSeconds(start);
        }}
        onSeek={seekSeconds}
      />
    </div>
  );
}
