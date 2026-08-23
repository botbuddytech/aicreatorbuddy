"use client";

import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { PlaceholderImage } from "@/components/create/PlaceholderImage";
import { visualLabel } from "@/components/create/editor/visualLabel";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import {
  FILTER_CSS,
  aspectClassName,
  sceneDuration,
  type Scene,
} from "@/lib/videoProject";
import type { ActiveClip } from "@/components/create/useTimelinePlayback";

function clock(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function IconButton({
  title,
  disabled,
  onClick,
  danger = false,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick?: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-35 ${
        danger
          ? "text-muted hover:bg-accent/15 hover:text-accent"
          : "text-muted hover:bg-white/5 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function EditorCanvas({
  scene,
  active,
  elapsed,
  total,
  playing,
  onToggle,
  onRestart,
  onSplit,
  onSeek,
}: {
  scene: Scene | null;
  active: ActiveClip | null;
  elapsed: number;
  total: number;
  playing: boolean;
  onToggle: () => void;
  onRestart: () => void;
  onSplit: () => void;
  onSeek: (seconds: number) => void;
}) {
  const { project, dispatch } = useVideoProject();
  const scrubRef = useRef<HTMLDivElement>(null);
  const display = active?.scene ?? scene;
  const overlay = display?.editing.textOverlay;
  const overlayClass =
    overlay?.position === "top"
      ? "top-8"
      : overlay?.position === "center"
        ? "top-1/2 -translate-y-1/2"
        : "bottom-14";
  const thumb = project.thumbnails.find((item) => item.id === project.selectedThumbnailId);
  const progress = total > 0 ? Math.min(elapsed / total, 1) : 0;
  const playLabel = playing ? "Pause" : elapsed >= total && total > 0 ? "Replay" : "Play";

  function seekFromClientX(clientX: number) {
    const node = scrubRef.current;
    if (!node || total <= 0) return;
    const rect = node.getBoundingClientRect();
    const ratio = rect.width <= 0 ? 0 : (clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, ratio)) * total);
  }

  function startScrub(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    seekFromClientX(event.clientX);
    const move = (moveEvent: PointerEvent) => seekFromClientX(moveEvent.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex shrink-0 items-center justify-center gap-0.5 border-b border-border bg-surface-soft px-2 py-1.5">
        <IconButton title="Split" disabled={!display} onClick={onSplit}>
          <Icon d="M8 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm0 12a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM11.2 9.1 20 4.2l.9 1.6-8.2 4.6 2.4 3.3L21 11v1.8l-7.6 4.2-2.8-3.8-1.5 1a2.6 2.6 0 0 1-3.6-1.2l1.5-1 1.8-1.2A2.6 2.6 0 0 1 11.2 9.1z" />
        </IconButton>
        <IconButton
          title="Duplicate"
          disabled={!display}
          onClick={() => display && dispatch({ type: "DUPLICATE_SCENE", id: display.id })}
        >
          <Icon d="M8 7h11v13H8V7zm-3-3h11v2H7v12H5V4z" />
        </IconButton>
        <IconButton
          title="Delete"
          danger
          disabled={!display || project.scenes.length < 2}
          onClick={() => display && dispatch({ type: "DELETE_SCENE", id: display.id })}
        >
          <Icon d="M9 4h6l1 2h4v2H4V6h4l1-2zm1 6h2v8h-2v-8zm4 0h2v8h-2v-8zM7 10h2v8H7v-8z" />
        </IconButton>
        <span className="mx-1 h-4 w-px bg-border" />
        <IconButton
          title="Move left"
          disabled={!display || display.order === 0}
          onClick={() =>
            display && dispatch({ type: "MOVE_SCENE", id: display.id, direction: "up" })
          }
        >
          <Icon d="M14.5 6 8 12l6.5 6 1.4-1.4L10.8 12l5.1-4.6L14.5 6z" />
        </IconButton>
        <IconButton
          title="Move right"
          disabled={!display || display.order === project.scenes.length - 1}
          onClick={() =>
            display && dispatch({ type: "MOVE_SCENE", id: display.id, direction: "down" })
          }
        >
          <Icon d="M9.5 6 16 12l-6.5 6-1.4-1.4L13.2 12 8.1 7.4 9.5 6z" />
        </IconButton>
      </div>

      <div className="relative flex min-h-[16rem] flex-1 items-center justify-center overflow-hidden bg-[#08090c] p-3">
        <div
          className={`relative overflow-hidden rounded-lg border border-white/10 bg-black shadow-[0_24px_60px_-32px_rgba(0,0,0,0.9)] ${
            project.summary.aspectRatio === "9:16"
              ? "h-full max-h-[28rem] aspect-[9/16]"
              : `w-full max-w-3xl ${aspectClassName(project.summary.aspectRatio)}`
          }`}
        >
          {display ? (
            <div
              className="absolute inset-0"
              style={{ filter: FILTER_CSS[display.editing.filter] }}
            >
              {active?.index === 0 && thumb?.customUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb.customUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <PlaceholderImage
                  label={visualLabel(display)}
                  className="h-full w-full rounded-none"
                />
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              No clips yet
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />

          {overlay?.text.trim() ? (
            <p
              className={`pointer-events-none absolute inset-x-4 text-center text-lg font-semibold text-white drop-shadow ${overlayClass}`}
            >
              {overlay.text}
            </p>
          ) : null}

          {project.editor.captions && display?.finalScript.trim() ? (
            <p className="pointer-events-none absolute inset-x-6 bottom-8 line-clamp-2 text-center text-sm font-medium text-white">
              {display.finalScript}
            </p>
          ) : null}

          {display ? (
            <div className="absolute left-2.5 top-2.5">
              <span className="inline-flex items-center rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white/90 backdrop-blur-sm">
                {String(display.order + 1).padStart(2, "0")} · {display.sectionLabel}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t border-border bg-surface-soft px-3 py-2.5">
        <button
          type="button"
          title={playLabel}
          aria-label={playLabel}
          onClick={onToggle}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-dark"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M7 5h3.5v14H7V5zm6.5 0H17v14h-3.5V5z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] ml-0.5" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5L8 5.5z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          title="Restart"
          aria-label="Restart"
          onClick={onRestart}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M12 5V2.2L7.8 6.4 12 10.6V8a4 4 0 1 1-3.7 5.5H6.15A6 6 0 1 0 12 5z" />
          </svg>
        </button>
        <div
          ref={scrubRef}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(elapsed)}
          tabIndex={0}
          className="relative h-1.5 min-w-0 flex-1 cursor-pointer rounded-full bg-white/10"
          onPointerDown={startScrub}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-accent"
            style={{ width: `${progress * 100}%` }}
          />
          <span
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_3px_rgba(255,59,78,0.25)]"
            style={{ left: `${progress * 100}%` }}
          />
        </div>
        <p className="shrink-0 font-mono text-[11px] tabular-nums text-muted">
          {clock(elapsed)} / {clock(total)}
          {display ? ` · ${sceneDuration(display)}s` : ""}
        </p>
      </div>
    </div>
  );
}
