"use client";

import { useRef, useState, type SyntheticEvent } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Textarea } from "@/components/ui/Textarea";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { ListenButton } from "@/components/create/scene/ListenButton";
import { ElevenLabsListenButton } from "@/features/elevenlabs/ElevenLabsListenButton";
import { buildClipPoster, clipKindFor } from "@/lib/clipPoster";
import { deleteClip, putClip } from "@/lib/clipStore";
import { deleteSceneClipFile, uploadSceneClipFile } from "@/lib/storage/sceneClipUpload";
import { deleteStartFrameFile, uploadStartFrameFile } from "@/lib/storage/sceneFrameUpload";
import { trackSessionEvent } from "@/lib/session/telemetry";
import { sceneDuration, type ClipSource, type Scene } from "@/lib/videoProject";

const MAX_CLIP_BYTES = 100 * 1024 * 1024;
const CLIP_ACCEPT = "image/*,video/*";
const FRAME_ACCEPT = "image/jpeg,image/png,image/webp";

type MediaConfirm = "delete-clip" | "replace-clip" | "delete-frame" | "replace-frame" | "higgsfield-replace";

function halt(event: SyntheticEvent) {
  event.stopPropagation();
}

function ClipUploadProgress({ percent }: { percent: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, percent)) / 100) * circumference;
  return (
    <span
      className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center text-accent"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Uploading clip, ${percent} percent`}
    >
      <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90" aria-hidden="true">
        <circle cx="20" cy="20" r={radius} fill="none" className="text-border" stroke="currentColor" strokeWidth="3" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-[9px] font-semibold tabular-nums text-foreground">{percent}</span>
    </span>
  );
}

function ClipSourceSwitch({
  value,
  onChange,
}: {
  value: ClipSource;
  onChange: (value: ClipSource) => void;
}) {
  const options = [
    ["direct", "Direct clip"],
    ["still", "Image, then clip"],
  ] as const;
  return (
    <div
      className="inline-flex max-w-full flex-wrap rounded-lg border border-border bg-surface-soft p-0.5"
      role="group"
      aria-label="How this scene’s clip is made"
    >
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
            value === id ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
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
  hideActions = false,
  generating = false,
  generatingImage = false,
  generateDisabled,
  generateImageDisabled,
  previewing = false,
  previewLoading = false,
  previewDisabled = false,
  elevenLabsPlaying = false,
  elevenLabsLoading = false,
  elevenLabsDisabled = false,
  elevenLabsVoiceSeconds = null,
  voiceLength = null,
  onElevenLabsPreview,
  onGenerate = () => {},
  onGenerateImage = () => {},
  onGenerateVideo,
  generatingVideo = false,
  generateVideoDisabled = false,
  videoNote = null,
  onPreview = () => {},
}: {
  scene: Scene;
  column: "script" | "visuals";
  labeled?: boolean;
  /** Show the script or visuals text without generate, upload, or preview controls. */
  hideActions?: boolean;
  generating?: boolean;
  generatingImage?: boolean;
  generateDisabled?: boolean;
  generateImageDisabled?: boolean;
  previewing?: boolean;
  /** Qwen is synthesizing the Listen preview. */
  previewLoading?: boolean;
  previewDisabled?: boolean;
  elevenLabsPlaying?: boolean;
  elevenLabsLoading?: boolean;
  elevenLabsDisabled?: boolean;
  elevenLabsVoiceSeconds?: number | null;
  /** Latest Qwen or ElevenLabs listen length for this scene. */
  voiceLength?: { provider: "qwen" | "elevenlabs"; seconds: number } | null;
  onElevenLabsPreview?: () => void;
  onGenerate?: () => void;
  onGenerateImage?: () => void;
  onGenerateVideo?: () => void;
  generatingVideo?: boolean;
  generateVideoDisabled?: boolean;
  videoNote?: string | null;
  onPreview?: () => void;
}) {
  const { project, dispatch } = useVideoProject();
  const fileRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [framePercent, setFramePercent] = useState<number | null>(null);
  const [copied, setCopied] = useState<"image" | "clip" | null>(null);
  const [mediaConfirm, setMediaConfirm] = useState<MediaConfirm | null>(null);
  const [deletingClip, setDeletingClip] = useState(false);
  const [deletingFrame, setDeletingFrame] = useState(false);
  const generateLabel = "Generate prompt";
  const clipName = scene.visuals.uploadedClipName;
  const frameName = scene.visuals.startFrameName;
  const hasFrame = Boolean(frameName || scene.visuals.startFrameStoragePath || scene.visuals.startFrameUrl);
  const clipSource: ClipSource = scene.visuals.clipSource === "still" ? "still" : "direct";

  async function copyText(kind: "image" | "clip", value: string) {
    const prompt = value.trim();
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setUploadError("Could not copy that prompt.");
    }
  }

  function setClipSource(next: ClipSource) {
    if (next === clipSource) return;
    dispatch({
      type: "PATCH_SCENE",
      id: scene.id,
      patch: { visuals: { clipSource: next } },
    });
  }

  function saveScenes(next: Scene[]) {
    dispatch({ type: "SET_SCENES", scenes: next, generated: true, keepStatus: true });
  }

  async function onUploadClip(file: File) {
    setUploadError(null);
    if (file.size > MAX_CLIP_BYTES) {
      setUploadError("Clip must be under 100MB.");
      return;
    }

    const previousPath = scene.visuals.uploadedClipStoragePath;
    const previousLocalId = scene.visuals.uploadedClipId;
    setUploadPercent(0);
    try {
      const stored = await uploadSceneClipFile(
        project.id,
        scene.id,
        file,
        previousPath,
        setUploadPercent,
      );
      let localClipId: string | null = null;
      let poster: string | null = null;
      let durationSeconds: number | null = null;
      try {
        localClipId = await putClip(file);
        const preview = await buildClipPoster(file);
        poster = preview.poster;
        durationSeconds = preview.durationSeconds;
      } catch {
        /* The stored file can still play if this browser cannot keep a local copy. */
      }
      saveScenes(
        project.scenes.map((item) =>
          item.id === scene.id
            ? {
                ...item,
                visuals: {
                  ...item.visuals,
                  uploadedClipId: localClipId ?? stored.clipId,
                  uploadedClipName: file.name,
                  uploadedClipStoragePath: stored.storagePath,
                  uploadedClipUrl: stored.url,
                  uploadedClipKind: clipKindFor(file),
                  uploadedClipDurationSeconds: durationSeconds,
                  thumbnailUrl: poster ?? item.visuals.thumbnailUrl,
                  description: item.visuals.description.trim() || file.name,
                  needsCustomFootage: true,
                },
                editing: {
                  ...item.editing,
                  trimStartSeconds: 0,
                  clipMuted: item.editing.clipMuted !== false,
                },
              }
            : item,
        ),
      );
      trackSessionEvent(project.id, {
        type: "asset.clip_added",
        step: "timeline",
        payload: {
          sceneKey: scene.id,
          localClipId: localClipId ?? stored.clipId,
          storagePath: stored.storagePath,
          fileName: file.name,
          mimeType: file.type || null,
          sizeBytes: file.size,
          durationSec: durationSeconds,
        },
      });
      if (previousLocalId && previousLocalId !== localClipId) await deleteClip(previousLocalId);
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "Could not upload that clip.");
    } finally {
      setUploadPercent(null);
    }
  }

  async function onRemoveClip() {
    const clipId = scene.visuals.uploadedClipId;
    const storagePath = scene.visuals.uploadedClipStoragePath;
    setUploadError(null);
    setDeletingClip(true);
    try {
      if (storagePath) await deleteSceneClipFile(project.id, scene.id, storagePath);
      saveScenes(
        project.scenes.map((item) =>
          item.id === scene.id
            ? {
                ...item,
                visuals: {
                  ...item.visuals,
                  uploadedClipId: null,
                  uploadedClipName: null,
                  uploadedClipStoragePath: null,
                  uploadedClipUrl: null,
                  uploadedClipKind: null,
                  uploadedClipDurationSeconds: null,
                  thumbnailUrl: null,
                  needsCustomFootage: false,
                },
                editing: { ...item.editing, trimStartSeconds: 0 },
              }
            : item,
        ),
      );
      if (clipId) await deleteClip(clipId);
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "Could not delete that clip.");
      setDeletingClip(false);
    }
  }

  async function onUploadFrame(file: File) {
    setUploadError(null);
    if (!file.type.startsWith("image/") || !FRAME_ACCEPT.split(",").includes(file.type)) {
      setUploadError("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_CLIP_BYTES) {
      setUploadError("Image must be under 100MB.");
      return;
    }
    const previousPath = scene.visuals.startFrameStoragePath;
    setFramePercent(0);
    try {
      const stored = await uploadStartFrameFile(
        project.id,
        scene.id,
        file,
        previousPath,
        setFramePercent,
      );
      saveScenes(
        project.scenes.map((item) =>
          item.id === scene.id
            ? {
                ...item,
                visuals: {
                  ...item.visuals,
                  startFrameId: stored.frameId,
                  startFrameName: file.name,
                  startFrameStoragePath: stored.storagePath,
                  startFrameUrl: stored.url,
                },
              }
            : item,
        ),
      );
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "Could not upload that image.");
    } finally {
      setFramePercent(null);
    }
  }

  async function onRemoveFrame() {
    const storagePath = scene.visuals.startFrameStoragePath;
    setUploadError(null);
    setDeletingFrame(true);
    try {
      if (storagePath) await deleteStartFrameFile(project.id, scene.id, storagePath);
      saveScenes(
        project.scenes.map((item) =>
          item.id === scene.id
            ? {
                ...item,
                visuals: {
                  ...item.visuals,
                  startFrameId: null,
                  startFrameName: null,
                  startFrameStoragePath: null,
                  startFrameUrl: null,
                },
              }
            : item,
        ),
      );
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "Could not delete that image.");
    } finally {
      setDeletingFrame(false);
    }
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
            readOnly
          />
        </>
      ) : (
        <>
          <ClipSourceSwitch value={clipSource} onChange={setClipSource} />
          {clipSource === "still" ? (
            <>
              <FieldLabel>Image prompt</FieldLabel>
              <Textarea
                aria-label="Image prompt"
                className="min-h-[5.5rem] text-xs"
                placeholder="Prompt for the opening still…"
                value={scene.visuals.imagePrompt}
                onChange={(event) =>
                  dispatch({
                    type: "PATCH_SCENE",
                    id: scene.id,
                    patch: { visuals: { imagePrompt: event.target.value }, status: "draft" },
                  })
                }
              />
              {hideActions ? null : (
                <ActionButton
                  size="sm"
                  loading={generatingImage}
                  loadingLabel="Generating…"
                  disabled={generateImageDisabled}
                  onClick={onGenerateImage}
                >
                  Generate image prompt
                </ActionButton>
              )}
              <p className="text-[11px] leading-snug text-muted">
                Make this image from the prompt, then attach it here.
              </p>
              {hasFrame ? (
                <div className="flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-border bg-surface-soft p-2">
                  {scene.visuals.startFrameUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={scene.visuals.startFrameUrl}
                      alt=""
                      className="h-10 w-16 shrink-0 rounded object-cover"
                    />
                  ) : null}
                  <p className="min-w-0 flex-1 truncate text-[11px] text-muted" title={frameName ?? undefined}>
                    {frameName || "Start image"}
                  </p>
                  <button
                    type="button"
                    aria-label={deletingFrame ? "Deleting start image" : "Delete start image"}
                    title={deletingFrame ? "Deleting start image" : "Delete start image"}
                    disabled={framePercent !== null || deletingFrame}
                    onClick={() => setMediaConfirm("delete-frame")}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-accent hover:bg-accent/10 ${deletingFrame ? "" : "disabled:opacity-40"}`}
                  >
                    {deletingFrame ? <ClipDeleteSpinner /> : <TrashIcon />}
                  </button>
                </div>
              ) : (
                <ActionButton
                  size="sm"
                  variant="secondary"
                  disabled={framePercent !== null}
                  onClick={() => frameRef.current?.click()}
                >
                  Upload start image
                </ActionButton>
              )}
              {framePercent !== null ? <ClipUploadProgress percent={framePercent} /> : null}
              <FieldLabel>Clip prompt</FieldLabel>
              <p className="text-[11px] leading-snug text-muted">
                Use this prompt together with the start image to make the clip.
              </p>
            </>
          ) : (
            <>
              {labeled ? <FieldLabel>Visuals</FieldLabel> : null}
              <p className="text-[11px] leading-snug text-muted">
                One prompt becomes the clip, in the timeline’s style.
              </p>
            </>
          )}
          <Textarea
            aria-label={clipSource === "still" ? "Clip prompt" : "Visuals"}
            className="min-h-[6rem] text-xs"
            placeholder={clipSource === "still" ? "Prompt for the clip that starts from the image…" : "Visual prompt for this clip…"}
            value={scene.visuals.description}
            onChange={(event) =>
              dispatch({
                type: "PATCH_SCENE",
                id: scene.id,
                patch: { visuals: { description: event.target.value }, status: "draft" },
              })
            }
          />
          {clipName || scene.visuals.uploadedClipStoragePath || scene.visuals.uploadedClipUrl ? (
            <div className="flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-border bg-surface-soft p-2">
              {scene.visuals.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={scene.visuals.thumbnailUrl}
                  alt=""
                  className="h-10 w-16 shrink-0 rounded object-cover"
                />
              ) : null}
              <p
                className="w-28 max-w-full shrink truncate text-[11px] text-muted"
                title={clipName ?? undefined}
              >
                {clipName || "Uploaded clip"}
              </p>
              <button
                type="button"
                aria-label={deletingClip ? "Deleting clip" : "Delete clip"}
                aria-busy={deletingClip}
                title={deletingClip ? "Deleting clip" : "Delete clip"}
                disabled={uploadPercent !== null || deletingClip}
                onClick={() => setMediaConfirm("delete-clip")}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-accent hover:bg-accent/10 ${deletingClip ? "" : "disabled:opacity-40"}`}
              >
                {deletingClip ? <ClipDeleteSpinner /> : <TrashIcon />}
              </button>
            </div>
          ) : null}
        </>
      )}

      {hideActions || column === "script" ? null : (
      <>
      <input
        ref={fileRef}
        type="file"
        accept={CLIP_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onUploadClip(file);
          event.target.value = "";
        }}
      />
      <input
        ref={frameRef}
        type="file"
        accept={FRAME_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onUploadFrame(file);
          event.target.value = "";
        }}
      />
      </>
      )}

      {hideActions ? null : (
      <div className="flex flex-wrap gap-2">
        {column === "script" ? null : (
          <>
            <button
              type="button"
              aria-label={scene.editing.clipMuted === false ? "Mute clip audio" : "Unmute clip audio"}
              title={scene.editing.clipMuted === false ? "Clip audio is on" : "Clip audio is muted"}
              onClick={() => {
                const clipMuted = scene.editing.clipMuted === false;
                saveScenes(
                  project.scenes.map((item) =>
                    item.id === scene.id
                      ? { ...item, editing: { ...item.editing, clipMuted } }
                      : item,
                  ),
                );
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-foreground hover:bg-white/5"
            >
              {scene.editing.clipMuted === false ? <SpeakerIcon /> : <SpeakerMutedIcon />}
            </button>
            <ActionButton
              size="sm"
              loading={generating}
              loadingLabel="Generating…"
              disabled={generateDisabled}
              onClick={onGenerate}
            >
              {generateLabel}
            </ActionButton>
            {onGenerateVideo ? (
              <button
                type="button"
                disabled={
                  generateVideoDisabled ||
                  generatingVideo ||
                  !scene.visuals.description.trim()
                }
                onClick={() => {
                  if (clipName || scene.visuals.uploadedClipStoragePath || scene.visuals.uploadedClipUrl) {
                    setMediaConfirm("higgsfield-replace");
                    return;
                  }
                  onGenerateVideo();
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#111111] px-3 text-xs font-semibold text-[#d6ff3f] hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
                  <rect width="16" height="16" rx="4" fill="currentColor" />
                  <path d="M8 2.4 9.15 6.85 13.6 8 9.15 9.15 8 13.6 6.85 9.15 2.4 8 6.85 6.85Z" className="fill-[#111111]" />
                </svg>
                {generatingVideo ? "Generating…" : "Generate"}
              </button>
            ) : null}
            <ActionButton
              size="sm"
              variant="secondary"
              disabled={uploadPercent !== null}
              onClick={() => {
                if (clipName || scene.visuals.uploadedClipStoragePath || scene.visuals.uploadedClipUrl) {
                  setMediaConfirm("replace-clip");
                  return;
                }
                fileRef.current?.click();
              }}
            >
              {clipName || scene.visuals.uploadedClipUrl ? "Replace clip" : "Upload clip"}
            </ActionButton>
            {uploadPercent !== null ? <ClipUploadProgress percent={uploadPercent} /> : null}
          </>
        )}
        {column === "script" ? (
          <ListenButton
            playing={previewing}
            loading={previewLoading}
            disabled={previewDisabled}
            onClick={onPreview}
          />
        ) : (
        <ActionButton
          size="sm"
          variant="secondary"
          disabled={previewDisabled && !previewing && !previewLoading}
          onClick={onPreview}
        >
          Preview
        </ActionButton>
        )}
        {column === "script" ? null : (
          <>
            <ActionButton
              size="sm"
              variant="secondary"
              disabled={!scene.visuals.description.trim()}
              onClick={() => void copyText("clip", scene.visuals.description)}
            >
              {copied === "clip" ? "Copied" : clipSource === "still" ? "Copy clip" : "Copy"}
            </ActionButton>
            {clipSource === "still" ? (
              <>
                <ActionButton
                  size="sm"
                  variant="secondary"
                  disabled={!scene.visuals.imagePrompt.trim()}
                  onClick={() => void copyText("image", scene.visuals.imagePrompt)}
                >
                  {copied === "image" ? "Copied" : "Copy image"}
                </ActionButton>
                {hasFrame ? (
                  <ActionButton
                    size="sm"
                    variant="secondary"
                    disabled={framePercent !== null || deletingFrame}
                    onClick={() => setMediaConfirm("replace-frame")}
                  >
                    Replace image
                  </ActionButton>
                ) : null}
              </>
            ) : null}
          </>
        )}
        {column === "script" && onElevenLabsPreview ? (
          <>
            <ElevenLabsListenButton
              playing={elevenLabsPlaying}
              loading={elevenLabsLoading}
              disabled={elevenLabsDisabled && !elevenLabsPlaying}
              onClick={onElevenLabsPreview}
            />
            <VoiceSyncReadout
              sceneSeconds={Math.round(sceneDuration(scene))}
              voice={voiceLength ?? (elevenLabsVoiceSeconds != null
                ? { provider: "elevenlabs", seconds: elevenLabsVoiceSeconds }
                : null)}
            />
          </>
        ) : null}
      </div>
      )}

      {hideActions || !uploadError ? null : (
        <p className="text-[11px] text-accent">{uploadError}</p>
      )}
      {hideActions || column === "script" || !videoNote ? null : (
        <p className="text-[11px] text-muted">{videoNote}</p>
      )}
      {column === "script" ? null : (
        <ConfirmModal
          open={mediaConfirm !== null}
          title={
            mediaConfirm === "replace-clip" || mediaConfirm === "higgsfield-replace"
              ? "Replace this clip?"
              : mediaConfirm === "delete-frame"
                ? "Delete this start image?"
                : mediaConfirm === "replace-frame"
                  ? "Replace this start image?"
                  : "Delete this clip?"
          }
          description={
            mediaConfirm === "higgsfield-replace"
              ? "Higgsfield will generate a new silent clip from this scene’s prompt. The current video is deleted from storage and cannot be retrieved."
              : mediaConfirm === "replace-clip"
              ? "The current video will be permanently deleted from storage and from this scene, then replaced with the new file. The old clip cannot be retrieved."
              : mediaConfirm === "delete-frame"
                ? "This permanently deletes the start image from this scene and from storage. It cannot be retrieved."
                : mediaConfirm === "replace-frame"
                  ? "The current start image will be permanently deleted from storage and from this scene, then replaced with the new file. The old image cannot be retrieved."
                  : "This permanently deletes the video from this scene, from storage, and from the database. It cannot be retrieved."
          }
          confirmLabel={
            mediaConfirm === "higgsfield-replace"
              ? "Generate clip"
              : mediaConfirm === "replace-clip"
              ? "Replace clip"
              : mediaConfirm === "delete-frame"
                ? "Delete image"
                : mediaConfirm === "replace-frame"
                  ? "Replace image"
                  : "Delete clip"
          }
          onClose={() => setMediaConfirm(null)}
          onConfirm={() => {
            const action = mediaConfirm;
            setMediaConfirm(null);
            if (action === "delete-clip") void onRemoveClip();
            if (action === "replace-clip") fileRef.current?.click();
            if (action === "higgsfield-replace") onGenerateVideo?.();
            if (action === "delete-frame") void onRemoveFrame();
            if (action === "replace-frame") frameRef.current?.click();
          }}
        />
      )}
    </div>
  );
}

function VoiceSyncReadout({
  sceneSeconds,
  voice,
}: {
  sceneSeconds: number;
  voice: { provider: "qwen" | "elevenlabs"; seconds: number } | null;
}) {
  const apart = voice != null && Math.abs(Math.round(voice.seconds) - sceneSeconds) > 1;
  const voiceLabel = voice == null ? "—" : `${Math.round(voice.seconds)}s`;
  return (
    <span className="inline-flex min-w-[11.5rem] items-center justify-center gap-2 rounded-xl border border-border bg-surface-soft px-3.5 py-2 text-sm tabular-nums">
      <span className="text-muted">Scene</span>
      <span className="font-bold text-red-500">{sceneSeconds}s</span>
      <span className="text-muted">·</span>
      {voice ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={voice.provider === "qwen" ? "/icons/providers/qwen.svg" : "/icons/providers/elevenlabs.svg"}
          alt=""
          className="h-4 w-4 shrink-0"
        />
      ) : (
        <span className="text-muted">Voice</span>
      )}
      <span className={`font-bold ${apart ? "text-red-500" : "text-foreground"}`}>{voiceLabel}</span>
    </span>
  );
}

function SpeakerMutedIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M11 5L6 9H3v6h3l5 4V5z" strokeLinejoin="round" />
      <path d="M16 9l5 6M21 9l-5 6" strokeLinecap="round" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M11 5L6 9H3v6h3l5 4V5z" strokeLinejoin="round" />
      <path d="M16 9a4 4 0 010 6M18.5 6.5a7.5 7.5 0 010 11" strokeLinecap="round" />
    </svg>
  );
}

function ClipDeleteSpinner() {
  return (
    <span
      className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent"
      aria-hidden="true"
    />
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 7h16" strokeLinecap="round" />
      <path d="M9 7V5h6v2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7l1 12h6l1-12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
