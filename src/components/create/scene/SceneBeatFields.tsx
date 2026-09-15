"use client";

import { useRef, useState, type SyntheticEvent } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Textarea } from "@/components/ui/Textarea";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { buildClipPoster, clipKindFor } from "@/lib/clipPoster";
import { deleteClip, putClip } from "@/lib/clipStore";
import type { Scene } from "@/lib/videoProject";

const MAX_SCRIPT_BYTES = 1024 * 1024;
const MAX_CLIP_BYTES = 100 * 1024 * 1024;
const SCRIPT_ACCEPT = ".txt,.md,text/plain";
const CLIP_ACCEPT = "image/*,video/*";

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const generateLabel = column === "script" ? "Generate script" : "Generate visuals";
  const clipName = scene.visuals.uploadedClipName;

  function onUploadScript(file: File) {
    setUploadError(null);
    if (file.size > MAX_SCRIPT_BYTES) {
      setUploadError("Script must be under 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (!text.trim()) {
        setUploadError("That file was empty.");
        return;
      }
      if (
        scene.finalScript.trim() &&
        !window.confirm("Replace this beat's script with the file?")
      ) {
        return;
      }
      dispatch({
        type: "PATCH_SCENE",
        id: scene.id,
        patch: { finalScript: text, status: "draft" },
      });
    };
    reader.onerror = () => setUploadError("Could not read that file.");
    reader.readAsText(file);
  }

  async function onUploadClip(file: File) {
    setUploadError(null);
    if (file.size > MAX_CLIP_BYTES) {
      setUploadError("Clip must be under 100MB.");
      return;
    }

    setUploading(true);
    try {
      const clipId = await putClip(file);
      if (!clipId) {
        setUploadError("Could not store that clip on this device.");
        return;
      }
      const { poster, durationSeconds } = await buildClipPoster(file);
      const previous = scene.visuals.uploadedClipId;
      dispatch({
        type: "PATCH_SCENE",
        id: scene.id,
        patch: {
          visuals: {
            uploadedClipId: clipId,
            uploadedClipName: file.name,
            uploadedClipKind: clipKindFor(file),
            uploadedClipDurationSeconds: durationSeconds,
            thumbnailUrl: poster,
            description: scene.visuals.description.trim() || file.name,
            needsCustomFootage: true,
          },
          // Swapping footage invalidates any trim aimed at the old clip.
          editing: {
            trimStartSeconds: 0,
            durationSeconds: durationSeconds
              ? Math.max(1, Math.floor(durationSeconds * 10) / 10)
              : scene.editing.durationSeconds,
          },
          status: "draft",
        },
      });
      if (previous) await deleteClip(previous);
    } finally {
      setUploading(false);
    }
  }

  async function onRemoveClip() {
    const clipId = scene.visuals.uploadedClipId;
    setUploadError(null);
    dispatch({
      type: "PATCH_SCENE",
      id: scene.id,
      patch: {
        visuals: {
          uploadedClipId: null,
          uploadedClipName: null,
          uploadedClipKind: null,
          uploadedClipDurationSeconds: null,
          thumbnailUrl: null,
          needsCustomFootage: false,
        },
        editing: { trimStartSeconds: 0 },
        status: "draft",
      },
    });
    if (clipId) await deleteClip(clipId);
  }

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
          {clipName && scene.visuals.thumbnailUrl ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-soft p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={scene.visuals.thumbnailUrl}
                alt=""
                className="h-10 w-16 shrink-0 rounded object-cover"
              />
              <p className="min-w-0 flex-1 truncate text-[11px] text-muted" title={clipName}>
                {clipName}
              </p>
              <button
                type="button"
                onClick={onRemoveClip}
                className="shrink-0 text-[11px] font-semibold text-accent hover:text-accent-dark"
              >
                Remove
              </button>
            </div>
          ) : null}
        </>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={column === "script" ? SCRIPT_ACCEPT : CLIP_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            if (column === "script") onUploadScript(file);
            else void onUploadClip(file);
          }
          event.target.value = "";
        }}
      />

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
          loading={uploading}
          loadingLabel="Uploading…"
          onClick={() => fileRef.current?.click()}
        >
          {column === "script" ? "Upload script" : clipName ? "Replace clip" : "Upload clip"}
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

      {uploadError ? <p className="text-[11px] text-accent">{uploadError}</p> : null}
    </div>
  );
}
