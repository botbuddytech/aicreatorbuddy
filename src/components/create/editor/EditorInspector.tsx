"use client";

import { useVideoProject } from "@/components/create/VideoProjectProvider";
import {
  FILTER_OPTIONS,
  sceneDuration,
  sceneSourceSeconds,
  type FilterId,
  type Scene,
} from "@/lib/videoProject";

const MIN_CLIP_SECONDS = 1;

function round1(seconds: number) {
  return Math.round(seconds * 10) / 10;
}

function FieldLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{children}</p>
  );
}

function TrimField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (seconds: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      <span className="flex items-center gap-1 rounded-lg border border-border bg-surface-soft px-2 py-1.5">
        <input
          type="number"
          min={min}
          max={Number.isFinite(max) ? max : undefined}
          step={0.1}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (!Number.isFinite(next) || next < min) return;
            onChange(Math.min(next, max));
          }}
          className="w-full bg-transparent text-xs tabular-nums text-foreground outline-none"
        />
        <span className="text-[10px] text-muted">s</span>
      </span>
    </label>
  );
}

export function EditorInspector({ scene }: { scene: Scene | null }) {
  const { project, dispatch } = useVideoProject();

  if (!scene) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm text-muted">Select a clip on the timeline.</p>
      </div>
    );
  }

  const sceneId = scene.id;
  const trimStart = scene.editing.trimStartSeconds;
  const duration = sceneDuration(scene);
  const source = sceneSourceSeconds(scene);
  const maxLength = source === null ? Infinity : Math.max(MIN_CLIP_SECONDS, source - trimStart);
  const maxTrimStart =
    source === null ? Infinity : Math.max(0, source - Math.max(MIN_CLIP_SECONDS, duration));

  function patchEditing(editing: Partial<Scene["editing"]>) {
    dispatch({ type: "PATCH_SCENE", id: sceneId, patch: { editing } });
  }

  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface p-4">
      <div>
        <p className="font-display text-sm font-semibold text-foreground">{scene.sectionLabel}</p>
        <p className="mt-0.5 text-[11px] text-muted">Clip {scene.order + 1}</p>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <FieldLabel>Trim</FieldLabel>
          {trimStart > 0 ? (
            <button
              type="button"
              onClick={() =>
                patchEditing({
                  trimStartSeconds: 0,
                  durationSeconds: round1(duration + trimStart),
                })
              }
              className="text-[11px] font-semibold text-accent hover:text-accent-dark"
            >
              Reset
            </button>
          ) : null}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <TrimField
            label="Start"
            value={trimStart}
            min={0}
            max={maxTrimStart}
            onChange={(next) => {
              const shift = next - trimStart;
              if (duration - shift < MIN_CLIP_SECONDS) return;
              patchEditing({
                trimStartSeconds: round1(next),
                durationSeconds: round1(duration - shift),
              });
            }}
          />
          <TrimField
            label="Length"
            value={duration}
            min={MIN_CLIP_SECONDS}
            max={maxLength}
            onChange={(next) => patchEditing({ durationSeconds: round1(next) })}
          />
        </div>
        <p className="mt-1 text-[11px] text-muted">
          {source === null
            ? "Drag either edge of a timeline clip, on any track, to trim."
            : `Source clip is ${source.toFixed(1)}s — trims can't run past it.`}
        </p>
      </div>

      <label className="flex items-center justify-between gap-2 text-sm">
        <span>Captions</span>
        <input
          type="checkbox"
          checked={project.editor.captions}
          onChange={(event) =>
            dispatch({ type: "UPDATE_EDITOR", patch: { captions: event.target.checked } })
          }
        />
      </label>

      <div>
        <FieldLabel>Fade / transition</FieldLabel>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          className="mt-2 w-full"
          value={scene.editing.transitionSeconds}
          onChange={(event) =>
            patchEditing({ transitionSeconds: Number(event.target.value) })
          }
        />
        <p className="mt-1 text-xs tabular-nums text-muted">
          {scene.editing.transitionSeconds.toFixed(1)}s {scene.editing.transition}
        </p>
      </div>

      <div>
        <FieldLabel>Filter</FieldLabel>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => patchEditing({ filter: option.id as FilterId })}
              className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold ${
                scene.editing.filter === option.id
                  ? "border-accent/50 bg-accent/10 text-accent"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Speed</FieldLabel>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.25}
          className="mt-2 w-full"
          value={scene.editing.speed}
          onChange={(event) => patchEditing({ speed: Number(event.target.value) })}
        />
        <p className="mt-1 text-xs tabular-nums text-muted">{scene.editing.speed.toFixed(2)}x</p>
      </div>

      <div>
        <FieldLabel>Voice volume</FieldLabel>
        <input
          type="range"
          min={0}
          max={100}
          className="mt-2 w-full"
          value={scene.editing.volume}
          onChange={(event) => patchEditing({ volume: Number(event.target.value) })}
        />
        <p className="mt-1 text-xs tabular-nums text-muted">{Math.round(scene.editing.volume)}%</p>
      </div>
    </div>
  );
}
