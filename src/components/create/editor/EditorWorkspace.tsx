"use client";

import { useEffect, useRef, useState } from "react";
import { EditorCanvas } from "@/components/create/editor/EditorCanvas";
import { EditorInspector } from "@/components/create/editor/EditorInspector";
import { EditorLeftRail, type EditorRailId } from "@/components/create/editor/EditorLeftRail";
import { EditorTimeline } from "@/components/create/editor/EditorTimeline";
import { ExportButton } from "@/components/create/ExportButton";
import { useTimelinePlayback } from "@/components/create/useTimelinePlayback";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { sceneDuration, sceneRuntimeSeconds } from "@/lib/videoProject";

export function EditorWorkspace() {
  const { project, dispatch } = useVideoProject();
  const [rail, setRail] = useState<EditorRailId>("assets");
  const [selectedId, setSelectedId] = useState(project.scenes[0]?.id ?? "");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const playback = useTimelinePlayback(project.scenes);

  const selected =
    project.scenes.find((scene) => scene.id === selectedId) ?? project.scenes[0] ?? null;

  // Adjust selection during render (instead of an effect) when the scene list
  // or the active playback scene changes, per https://react.dev/learn/you-might-not-need-an-effect
  const [prevScenes, setPrevScenes] = useState(project.scenes);
  if (project.scenes !== prevScenes) {
    setPrevScenes(project.scenes);
    if (!project.scenes.some((scene) => scene.id === selectedId)) {
      setSelectedId(project.scenes[0]?.id ?? "");
    }
  }

  const activeSceneId = playback.playing ? playback.active?.scene.id : undefined;
  const [prevActiveSceneId, setPrevActiveSceneId] = useState(activeSceneId);
  if (activeSceneId !== prevActiveSceneId) {
    setPrevActiveSceneId(activeSceneId);
    if (activeSceneId) {
      setSelectedId(activeSceneId);
    }
  }

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

  function splitAtPlayhead() {
    const active = playback.active;
    if (!active) return;
    const fraction =
      active.duration > 0 ? (playback.elapsed - active.start) / active.duration : 0;
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
          active={playback.active}
          elapsed={playback.elapsed}
          total={playback.total}
          playing={playback.playing}
          onToggle={playback.toggle}
          onRestart={playback.restart}
          onSplit={splitAtPlayhead}
          onSeek={playback.seek}
        />
        <EditorInspector scene={selected} />
      </div>
      <EditorTimeline
        scenes={project.scenes}
        selectedId={selected?.id ?? null}
        elapsed={playback.elapsed}
        total={playback.total}
        onSelect={(id) => {
          setSelectedId(id);
          const index = project.scenes.findIndex((scene) => scene.id === id);
          if (index < 0) return;
          let start = 0;
          for (let i = 0; i < index; i += 1) {
            const scene = project.scenes[i];
            if (scene) start += sceneRuntimeSeconds(scene);
          }
          playback.seek(start);
        }}
        onSeek={playback.seek}
      />
    </div>
  );
}
