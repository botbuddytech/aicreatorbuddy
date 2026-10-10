"use client";

import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import {
  sceneDuration,
  sceneRuntimeSeconds,
  sceneSourceSeconds,
  type Scene,
} from "@/lib/videoProject";

const GUTTER = "w-[4.75rem]";

const MIN_CLIP_SECONDS = 1;

/** Trims land on tenths so a slow drag still reads as a deliberate value. */
function snapSeconds(seconds: number) {
  return Math.round(seconds * 10) / 10;
}

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

const PX_PER_SECOND = 48;

export type TimelineTrackId = "text" | "video" | "audio";

export function EditorTimeline({
  scenes,
  selectedId,
  selectedTrack,
  elapsed,
  total,
  timelineZoom,
  onTimelineZoom,
  onFocusTrack,
  onSelectVideo,
  onSelectAudio,
  onSelectText,
  onSeek,
}: {
  scenes: Scene[];
  selectedId: string | null;
  selectedTrack: TimelineTrackId;
  elapsed: number;
  total: number;
  timelineZoom: number;
  onTimelineZoom: (zoom: number) => void;
  onFocusTrack: (track: TimelineTrackId) => void;
  onSelectVideo: (id: string) => void;
  onSelectAudio: (id: string) => void;
  onSelectText: (id: string) => void;
  onSeek: (seconds: number) => void;
}) {
  const { project, dispatch } = useVideoProject();
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackMinWidth = Math.max(320, total * PX_PER_SECOND * timelineZoom);
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

  /**
   * Both edges are delta-based off the pointerdown position: the scale is frozen
   * at drag start so the clip resizing (and shrinking `total`) can't feed back
   * into the pixels-to-seconds mapping mid-drag.
   */
  function beginTrim(scene: Scene, edge: "start" | "end", event: ReactPointerEvent) {
    event.stopPropagation();
    event.preventDefault();
    const trackWidth = trackRef.current?.getBoundingClientRect().width ?? 0;
    if (trackWidth <= 0 || total <= 0) return;

    const originX = event.clientX;
    const startDuration = sceneDuration(scene);
    const startTrim = scene.editing.trimStartSeconds;
    const source = sceneSourceSeconds(scene);
    const speed = scene.editing.speed > 0 ? scene.editing.speed : 1;
    // Timeline pixels are runtime seconds; the stored duration is source seconds.
    const secondsPerPixel = (total / trackWidth) * speed;

    const move = (moveEvent: PointerEvent) => {
      const delta = (moveEvent.clientX - originX) * secondsPerPixel;
      if (edge === "end") {
        // The tail can never pass the end of the footage: what's left of the
        // source after the in-point is the hard ceiling.
        const maxDuration =
          source === null ? Infinity : Math.max(MIN_CLIP_SECONDS, source - startTrim);
        dispatch({
          type: "PATCH_SCENE",
          id: scene.id,
          patch: {
            editing: {
              durationSeconds: snapSeconds(
                Math.min(maxDuration, Math.max(MIN_CLIP_SECONDS, startDuration + delta)),
              ),
            },
          },
        });
        return;
      }
      // Dragging the head moves the in-point and eats the same amount of duration,
      // so later scenes never shift and no gap opens up.
      const shift = Math.max(-startTrim, Math.min(startDuration - MIN_CLIP_SECONDS, delta));
      dispatch({
        type: "PATCH_SCENE",
        id: scene.id,
        patch: {
          editing: {
            trimStartSeconds: snapSeconds(startTrim + shift),
            durationSeconds: snapSeconds(startDuration - shift),
          },
        },
      });
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function trimHandlers(scene: Scene) {
    const source = sceneSourceSeconds(scene);
    return {
      onTrimStart: (event: ReactPointerEvent) => beginTrim(scene, "start", event),
      onTrimEnd: (event: ReactPointerEvent) => beginTrim(scene, "end", event),
      endLocked:
        source !== null && sceneDuration(scene) + scene.editing.trimStartSeconds >= source - 0.05,
    };
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-1.5 text-[11px] text-muted">
        <p className="font-semibold uppercase tracking-wide">Timeline</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden text-[10px] text-muted sm:inline">
            Space/K play · J/L step · Home/End
          </span>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-soft p-0.5">
            <button
              type="button"
              title="Zoom out"
              aria-label="Zoom out"
              className="rounded px-2 py-0.5 text-[10px] font-semibold hover:bg-white/5"
              onClick={() => onTimelineZoom(Math.max(0.5, timelineZoom - 0.25))}
            >
              −
            </button>
            <span className="min-w-[3rem] text-center font-mono tabular-nums text-[10px]">
              {Math.round(timelineZoom * 100)}%
            </span>
            <button
              type="button"
              title="Zoom in"
              aria-label="Zoom in"
              className="rounded px-2 py-0.5 text-[10px] font-semibold hover:bg-white/5"
              onClick={() => onTimelineZoom(Math.min(3, timelineZoom + 0.25))}
            >
              +
            </button>
            <button
              type="button"
              title="Fit timeline"
              aria-label="Fit timeline"
              className="rounded px-2 py-0.5 text-[10px] font-semibold hover:bg-white/5"
              onClick={() => onTimelineZoom(1)}
            >
              Fit
            </button>
          </div>
          <p className="font-mono tabular-nums">{clock(total)}</p>
        </div>
      </div>
      <div ref={scrollRef} className="overflow-x-auto">
      <div className="flex" style={{ minWidth: trackMinWidth }}>
        <div className={`${GUTTER} shrink-0 border-r border-border bg-surface-soft`}>
          <div className="h-7 border-b border-border" />
          <TrackHeader
            label="Text"
            icon="M5 5h14v3h-5v11h-4V8H5V5z"
            className="h-10"
            active={selectedTrack === "text"}
            onClick={() => onFocusTrack("text")}
          />
          <TrackHeader
            label="Video"
            icon="M3 6h13v12H3V6zm15 1.5h3v4h-3v-4zm0 5.5h3v4h-3v-4z"
            className="h-12"
            alt
            active={selectedTrack === "video"}
            onClick={() => onFocusTrack("video")}
          />
          <TrackHeader
            label="Voice"
            icon="M5 13h2.2v5H5v-5zm4-3h2.2v8H9v-8zm4-4h2.2v12H13V6zm4 2h2.2v10H17V8z"
            className="h-11"
            active={selectedTrack === "audio"}
            onClick={() => onFocusTrack("audio")}
          />
        </div>
        <div ref={trackRef} className="relative min-w-0 flex-1 select-none">
          <div
            className="relative h-7 overflow-hidden border-b border-border bg-surface-soft"
            onPointerDown={startSeek}
          >
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

          <TrackRow className="h-10" onBackgroundSeek={startSeek}>
            {scenes.map((scene) => {
              const runtime = sceneRuntimeSeconds(scene);
              const overlay = scene.editing.textOverlay?.text.trim();
              return (
                <ClipBlock
                  key={`text-${scene.id}`}
                  flex={runtime}
                  selected={scene.id === selectedId && selectedTrack === "text"}
                  tone="text"
                  ghost={!overlay}
                  label={overlay || "Add text"}
                  duration={runtime}
                  onSelect={() => onSelectText(scene.id)}
                />
              );
            })}
          </TrackRow>

          <TrackRow className="h-12 bg-white/[0.025]" onBackgroundSeek={startSeek}>
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
                    selected={scene.id === selectedId && selectedTrack === "video"}
                    tone="video"
                    label={`${String(scene.order + 1).padStart(2, "0")} ${scene.sectionLabel}`}
                    duration={runtime}
                    trimmed={scene.editing.trimStartSeconds > 0}
                    onSelect={() => onSelectVideo(scene.id)}
                    {...trimHandlers(scene)}
                  />
                  {scene.editing.transitionIn !== "none" ? (
                    <span
                      title={`In: ${scene.editing.transitionIn}`}
                      className="pointer-events-none absolute left-1 top-1 z-10 rounded bg-chart-purple px-1 py-px text-[9px] font-bold uppercase text-white"
                    >
                      in
                    </span>
                  ) : null}
                  {scene.editing.transition !== "none" ? (
                    <span
                      title={next ? `Out into ${next.sectionLabel}` : "Out"}
                      className="pointer-events-none absolute right-1 top-1 z-10 rounded bg-chart-purple px-1 py-px text-[9px] font-bold uppercase text-white"
                    >
                      out
                    </span>
                  ) : null}
                </div>
              );
            })}
          </TrackRow>

          <TrackRow className="h-11" onBackgroundSeek={startSeek}>
            {scenes.map((scene) => {
              const runtime = sceneRuntimeSeconds(scene);
              const hasVo =
                scene.voiceover.status === "ready" || Boolean(scene.finalScript.trim());
              const clipAudio =
                scene.visuals.uploadedClipKind === "video" && !scene.editing.clipMuted;
              const label = hasVo
                ? `VO · ${scene.sectionLabel}`
                : clipAudio
                  ? `Clip · ${scene.sectionLabel}`
                  : `Silent · ${scene.sectionLabel}`;
              return (
                <ClipBlock
                  key={`audio-${scene.id}`}
                  flex={runtime}
                  selected={scene.id === selectedId && selectedTrack === "audio"}
                  tone="audio"
                  label={label}
                  duration={runtime}
                  waveform={hasVo || clipAudio}
                  ghost={!hasVo && !clipAudio}
                  onSelect={() => onSelectAudio(scene.id)}
                  {...trimHandlers(scene)}
                />
              );
            })}
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
    </div>
  );
}

function TrackHeader({
  label,
  icon,
  className,
  alt = false,
  active = false,
  onClick,
}: {
  label: string;
  icon: string;
  className?: string;
  alt?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col items-center justify-center gap-0.5 border-b border-border px-1 text-center transition-colors ${
        alt ? "bg-white/[0.025]" : ""
      } ${active ? "bg-accent/10 text-accent" : "text-muted hover:bg-white/5 hover:text-foreground"} ${
        className ?? ""
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
        <path d={icon} />
      </svg>
      <span className="text-[9px] font-semibold uppercase tracking-wide">{label}</span>
    </button>
  );
}

function TrackRow({
  children,
  className = "",
  onBackgroundSeek,
}: {
  children: ReactNode;
  className?: string;
  onBackgroundSeek?: (event: ReactPointerEvent) => void;
}) {
  return (
    <div
      className={`flex items-center gap-0.5 border-b border-border/80 px-0.5 py-1 ${className}`}
      onPointerDown={onBackgroundSeek}
    >
      <div className="flex h-full min-w-0 flex-1 items-stretch gap-0.5">{children}</div>
    </div>
  );
}

function TrimHandle({
  side,
  locked = false,
  onPointerDown,
}: {
  side: "left" | "right";
  locked?: boolean;
  onPointerDown: (event: ReactPointerEvent) => void;
}) {
  return (
    <span
      role="separator"
      aria-label={
        locked
          ? "Clip end — no source footage left"
          : side === "left"
            ? "Trim clip start"
            : "Trim clip end"
      }
      title={locked ? "End of the source clip" : undefined}
      className={`group absolute inset-y-0 z-20 flex w-2.5 cursor-ew-resize items-center justify-center ${
        side === "left" ? "left-0" : "right-0"
      } ${locked ? "bg-chart-amber/30 hover:bg-chart-amber/45" : "bg-white/10 hover:bg-white/35"}`}
      onPointerDown={onPointerDown}
    >
      <span
        className={`h-2.5 w-px ${locked ? "bg-chart-amber" : "bg-white/50 group-hover:bg-white"}`}
      />
    </span>
  );
}

function ClipBlock({
  flex,
  selected,
  tone,
  label,
  duration,
  waveform = false,
  trimmed = false,
  ghost = false,
  endLocked = false,
  onSelect,
  onTrimStart,
  onTrimEnd,
}: {
  flex: number;
  selected: boolean;
  tone: "text" | "video" | "audio";
  label: string;
  duration: number;
  waveform?: boolean;
  trimmed?: boolean;
  ghost?: boolean;
  endLocked?: boolean;
  onSelect: () => void;
  onTrimStart?: (event: ReactPointerEvent) => void;
  onTrimEnd?: (event: ReactPointerEvent) => void;
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
      className={`relative h-full min-w-0 w-full overflow-hidden rounded-md text-left ${
        ghost ? "border border-dashed border-white/15 bg-transparent" : tones[tone].bg
      } ${
        selected
          ? "ring-1 ring-accent shadow-[0_0_0_1px_rgba(255,59,78,0.35)]"
          : "ring-1 ring-transparent hover:ring-white/15"
      }`}
      style={{ flexGrow: flex, flexBasis: 0 }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {ghost ? null : <span className={`absolute inset-y-0 left-0 w-[3px] ${tones[tone].strip}`} />}
      {waveform ? <Waveform className="absolute inset-y-1 left-3 right-1 opacity-70" /> : null}
      <span className="relative z-10 flex h-full items-center justify-between gap-2 py-1 pl-3.5 pr-3">
        <span
          className={`min-w-0 truncate text-[11px] font-semibold ${
            ghost ? "text-muted" : "text-foreground"
          }`}
        >
          {trimmed ? "✂ " : ""}
          {label}
        </span>
        <span className="shrink-0 font-mono text-[9px] tabular-nums text-muted">{clock(duration)}</span>
      </span>
      {onTrimStart ? <TrimHandle side="left" onPointerDown={onTrimStart} /> : null}
      {onTrimEnd ? <TrimHandle side="right" locked={endLocked} onPointerDown={onTrimEnd} /> : null}
    </button>
  );
}
