"use client";

import { useVideoProject } from "@/components/create/VideoProjectProvider";
import {
  FILTER_OPTIONS,
  type FilterId,
  type Scene,
} from "@/lib/videoProject";

function FieldLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{children}</p>
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

  function patchEditing(editing: Partial<Scene["editing"]>) {
    dispatch({ type: "PATCH_SCENE", id: sceneId, patch: { editing } });
  }

  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface p-4">
      <div>
        <p className="font-display text-sm font-semibold text-foreground">{scene.sectionLabel}</p>
        <p className="mt-0.5 text-[11px] text-muted">Clip {scene.order + 1}</p>
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
