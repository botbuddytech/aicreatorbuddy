"use client";

import type { SyntheticEvent } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Textarea } from "@/components/ui/Textarea";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import type { Scene } from "@/lib/videoProject";

function halt(event: SyntheticEvent) {
  event.stopPropagation();
}

function FieldLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{children}</p>
  );
}

export function SceneBeatFields({
  scene,
  column,
  labeled = false,
  generating,
  generateDisabled,
  previewing = false,
  previewDisabled = false,
  onGenerate,
  onPreview,
}: {
  scene: Scene;
  column: "script" | "visuals";
  labeled?: boolean;
  generating: boolean;
  generateDisabled?: boolean;
  previewing?: boolean;
  previewDisabled?: boolean;
  onGenerate: () => void;
  onPreview: () => void;
}) {
  const { dispatch } = useVideoProject();
  const generateLabel = column === "script" ? "Generate script" : "Generate visuals";

  return (
    <div className="space-y-2" onClick={halt} onMouseDown={halt}>
      {column === "script" ? (
        <>
          {labeled ? <FieldLabel>Final script / voiceover</FieldLabel> : null}
          <Textarea
            aria-label="Final script / voiceover"
            className="min-h-[7.5rem] text-xs"
            placeholder="Spoken script for this beat…"
            value={scene.finalScript}
            onChange={(event) =>
              dispatch({
                type: "PATCH_SCENE",
                id: scene.id,
                patch: { finalScript: event.target.value, status: "draft" },
              })
            }
          />
        </>
      ) : (
        <>
          {labeled ? <FieldLabel>Visuals</FieldLabel> : null}
          <Textarea
            aria-label="Visuals"
            className="min-h-[6rem] text-xs"
            placeholder="What should appear on screen…"
            value={scene.visuals.description}
            onChange={(event) =>
              dispatch({
                type: "PATCH_SCENE",
                id: scene.id,
                patch: { visuals: { description: event.target.value }, status: "draft" },
              })
            }
          />
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <ActionButton
          size="sm"
          loading={generating}
          loadingLabel="Generating…"
          disabled={generateDisabled}
          onClick={onGenerate}
        >
          {labeled ? generateLabel : "Generate"}
        </ActionButton>
        <ActionButton
          size="sm"
          variant="secondary"
          disabled={previewDisabled && !previewing}
          onClick={onPreview}
        >
          {column === "script"
            ? previewing
              ? "Stop"
              : "Listen"
            : "Preview"}
        </ActionButton>
      </div>
    </div>
  );
}
