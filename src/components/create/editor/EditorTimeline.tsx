"use client";

import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { mockMusicTracks } from "@/lib/mockAi";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import {
  sceneDuration,
  sceneRuntimeSeconds,
  sceneTimeRange,
  type Scene,
} from "@/lib/videoProject";

const GUTTER = "w-[4.75rem]";

function clock(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function rulerStep(total: number) {
  if (total <= 20) return 1;
  if (total <= 60) return 5;
  if (total <= 180) return 10;
  return 30;
}

const WAVE_HEIGHTS = [
  38, 72, 54, 90, 44, 81, 61, 34, 76, 49, 94, 41, 67, 86, 52, 73, 36, 83, 58, 91, 47, 64, 85, 40,
];

function Waveform({ className = "" }: { className?: string }) {
  const bars = [...WAVE_HEIGHTS, ...WAVE_HEIGHTS, ...WAVE_HEIGHTS];
  return (
    <div className={`flex h-full items-center gap-[2px] overflow-hidden ${className}`}>
      {bars.map((height, index) => (
        <span
          key={index}
          className="w-[2px] shrink-0 rounded-full bg-chart-blue/75"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

export function EditorTimeline({
  scenes,
  selectedId,
  elapsed,
  total,
  onSelect,
  onSeek,
}: {
  scenes: Scene[];
  selectedId: string | null;
  elapsed: number;
  total: number;
  onSelect: (id: string) => void;
  onSeek: (seconds: number) => void;
}) {
  const { project, dispatch } = useVideoProject();
  const trackRef = useRef<HTMLDivElement>(null);
  const music = mockMusicTracks.find((track) => track.id === project.editor.musicTrackId);
  const playhead = total > 0 ? Math.min(elapsed / total, 1) : 0;
  const step = rulerStep(total);
  const ticks: number[] = [];
  for (let t = 0; t <= total + 0.001; t += step) ticks.push(t);

  function seekFromClientX(clientX: number) {
    const node = trackRef.current;
    if (!node || total <= 0) return;
    const rect = node.getBoundingClientRect();
    const ratio = rect.width <= 0 ? 0 : (clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, ratio)) * total);
  }

  function startSeek(event: ReactPointerEvent) {
    seekFromClientX(event.clientX);
    const move = (moveEvent: PointerEvent) => seekFromClientX(moveEvent.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function trimScene(scene: Scene, clientX: number, trackWidth: number) {
    if (trackWidth <= 0 || total <= 0) return;
    const runtime = sceneRuntimeSeconds(scene);
    const range = sceneTimeRange(scenes, scene.order);
    const endX = ((range.start + runtime) / total) * trackWidth;
    const deltaPx = clientX - (trackRef.current?.getBoundingClientRect().left ?? 0) - endX;
    const deltaSeconds = (deltaPx / trackWidth) * total * scene.editing.speed;
    const next = Math.max(1, Math.round(sceneDuration(scene) + deltaSeconds));
    dispatch({
      type: "PATCH_SCENE",
      id: scene.id,
      patch: { editing: { durationSeconds: next } },
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-[11px] text-muted">
        <p className="font-semibold uppercase tracking-wide">Timeline</p>
        <p className="font-mono tabular-nums">{clock(total)}</p>
      </div>
      <div className="flex">
        <div className={`${GUTTER} shrink-0 border-r border-border bg-surface-soft`}>
          <div className="h-7 border-b border-border" />
          <TrackHeader
            label="Text"
            icon="M5 5h14v3h-5v11h-4V8H5V5z"
            className="h-10"
          />
          <TrackHeader
            label="Video"
            icon="M3 6h13v12H3V6zm15 1.5h3v4h-3v-4zm0 5.5h3v4h-3v-4z"
            className="h-12"
            alt
          />
          <TrackHeader
            label="Audio"
            icon="M5 13h2.2v5H5v-5zm4-3h2.2v8H9v-8zm4-4h2.2v12H13V6zm4 2h2.2v10H17V8z"
            className="h-11"
          />
        </div>
        <div
          ref={trackRef}
          className="relative min-w-0 flex-1 select-none"
          onPointerDown={startSeek}
        >
          <div className="relative h-7 overflow-hidden border-b border-border bg-surface-soft">
            {ticks.map((tick) => {
              const pct = total > 0 ? (tick / total) * 100 : 0;
              return (
                <div
                  key={tick}
                  className="absolute top-0 flex h-full flex-col"
                  style={{ left: `${pct}%` }}
                >
                  <span className="h-1.5 w-px bg-white/30" />
                  <span
                    className={`mt-0.5 font-mono text-[9px] tabular-nums text-muted ${
                      pct > 96 ? "-translate-x-full pr-0.5" : pct < 2 ? "pl-0.5" : "-translate-x-1/2"
                    }`}
                  >
                    {clock(tick)}
                  </span>
                </div>
              );
            })}
          </div>

          <TrackRow className="h-10">
            {scenes.map((scene) => {
              const runtime = sceneRuntimeSeconds(scene);
              const overlay = scene.editing.textOverlay?.text.trim();
              return (
                <ClipBlock
                  key={`text-${scene.id}`}
                  flex={runtime}
                  selected={scene.id === selectedId}
                  tone="text"
                  label={overlay ? overlay : "Text"}
                  duration={runtime}
                  onSelect={() => onSelect(scene.id)}
                />
              );
            })}
          </TrackRow>

          <TrackRow className="h-12 bg-white/[0.025]">
            {scenes.map((scene, index) => {
              const runtime = sceneRuntimeSeconds(scene);
              const next = scenes[index + 1];
              return (
                <div
                  key={scene.id}
                  className="relative flex min-w-0"
                  style={{ flexGrow: runtime, flexBasis: 0 }}
                >
                  <ClipBlock
                    flex={1}
                    selected={scene.id === selectedId}
                    tone="video"
                    label={`${String(scene.order + 1).padStart(2, "0")} ${scene.sectionLabel}`}
                    duration={runtime}
                    onSelect={() => onSelect(scene.id)}
                    onTrim={(event) => {
                      event.stopPropagation();
                      const width = trackRef.current?.getBoundingClientRect().width ?? 0;
                      const move = (moveEvent: PointerEvent) =>
                        trimScene(scene, moveEvent.clientX, width);
                      const up = () => {
                        window.removeEventListener("pointermove", move);
                        window.removeEventListener("pointerup", up);
                      };
                      window.addEventListener("pointermove", move);
                      window.addEventListener("pointerup", up);
                    }}
                  />
                  {next && scene.editing.transition !== "none" ? (
                    <span className="pointer-events-none absolute -right-2 top-1/2 z-10 -translate-y-1/2 rounded bg-chart-purple px-1 py-px text-[9px] font-bold uppercase text-white">
                      {scene.editing.transition}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </TrackRow>

          <TrackRow className="h-11">
            {music ? (
              <div
                className="relative flex h-10 min-w-0 items-center overflow-hidden rounded-md bg-chart-blue/20 px-2"
                style={{ flexGrow: 1 }}
              >
                <Waveform className="absolute inset-x-2 inset-y-1 opacity-80" />
                <p className="relative z-10 truncate text-[11px] font-semibold text-foreground drop-shadow">
                  {music.title}
                </p>
              </div>
            ) : (
              scenes.map((scene) => (
                <ClipBlock
                  key={`audio-${scene.id}`}
                  flex={sceneRuntimeSeconds(scene)}
                  selected={scene.id === selectedId}
                  tone="audio"
                  label={scene.finalScript.trim() ? "VO" : "—"}
                  duration={sceneRuntimeSeconds(scene)}
                  waveform
                  onSelect={() => onSelect(scene.id)}
                />
              ))
            )}
          </TrackRow>

          <div
            className="pointer-events-none absolute inset-y-0 z-20"
            style={{ left: `${playhead * 100}%` }}
          >
            <button
              type="button"
              aria-label="Playhead"
              className="pointer-events-auto absolute inset-y-0 left-1/2 z-30 w-3 -translate-x-1/2 cursor-ew-resize"
              onPointerDown={(event) => {
                event.stopPropagation();
                startSeek(event);
              }}
            >
              <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-[1px] bg-accent shadow-[0_0_0_2px_rgba(255,59,78,0.28)] [clip-path:polygon(0_0,100%_0,50%_100%)]" />
              <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-accent" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackHeader({
  label,
  icon,
  className,
  alt = false,
}: {
  label: string;
  icon: string;
  className?: string;
  alt?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-0.5 border-b border-border px-1 text-center ${
        alt ? "bg-white/[0.025]" : ""
      } ${className ?? ""}`}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-muted" fill="currentColor" aria-hidden="true">
        <path d={icon} />
      </svg>
      <span className="text-[9px] font-semibold uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}

function TrackRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-0.5 border-b border-border/80 px-0.5 py-1 ${className}`}>
      <div className="flex h-full min-w-0 flex-1 items-stretch gap-0.5">{children}</div>
    </div>
  );
}

function ClipBlock({
  flex,
  selected,
  tone,
  label,
  duration,
  waveform = false,
  onSelect,
  onTrim,
}: {
  flex: number;
  selected: boolean;
  tone: "text" | "video" | "audio";
  label: string;
  duration: number;
  waveform?: boolean;
  onSelect: () => void;
  onTrim?: (event: ReactPointerEvent) => void;
}) {
  const tones = {
    text: {
      bg: "bg-chart-purple/25",
      strip: "bg-chart-purple",
    },
    video: {
      bg: "bg-accent/20",
      strip: "bg-accent",
    },
    audio: {
      bg: "bg-chart-blue/20",
      strip: "bg-chart-blue",
    },
  };

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      className={`relative h-full min-w-0 w-full overflow-hidden rounded-md text-left ${tones[tone].bg} ${
        selected
          ? "ring-1 ring-accent shadow-[0_0_0_1px_rgba(255,59,78,0.35)]"
          : "ring-1 ring-transparent hover:ring-white/15"
      }`}
      style={{ flexGrow: flex, flexBasis: 0 }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <span className={`absolute inset-y-0 left-0 w-[3px] ${tones[tone].strip}`} />
      {waveform ? <Waveform className="absolute inset-y-1 left-3 right-1 opacity-70" /> : null}
      <span className="relative z-10 flex h-full items-center justify-between gap-2 py-1 pl-2.5 pr-3">
        <span className="min-w-0 truncate text-[11px] font-semibold text-foreground">{label}</span>
        <span className="shrink-0 font-mono text-[9px] tabular-nums text-muted">{clock(duration)}</span>
      </span>
      {onTrim ? (
        <span
          className="absolute inset-y-0 right-0 z-20 w-2.5 cursor-ew-resize bg-white/15 hover:bg-white/30"
          onPointerDown={onTrim}
        />
      ) : null}
    </button>
  );
}
