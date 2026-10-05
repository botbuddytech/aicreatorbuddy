"use client";

import { useEffect, useRef, useState } from "react";
import { FieldFlash } from "@/components/agent/FieldFlash";
import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { GenerateBar } from "@/components/create/GenerateBar";
import { LowEffortCheck } from "@/components/create/LowEffortCheck";
import { SceneBeatFields } from "@/components/create/scene/SceneBeatFields";
import { SceneCard } from "@/components/create/scene/SceneCard";
import { SceneVisualPreviewModal } from "@/components/create/scene/SceneVisualPreviewModal";
import { TimelineChart } from "@/components/create/scene/TimelineChart";
import { StepFixModal } from "@/components/create/StepFixModal";
import { ElevenLabsVoiceSelect } from "@/features/elevenlabs/ElevenLabsVoiceSelect";
import { useElevenLabsPreview } from "@/features/elevenlabs/useElevenLabsPreview";
import { MAX_PREVIEW_CHARS } from "@/features/elevenlabs/contract";
import { useCursorVisualPromptGeneration } from "@/features/cursor-visual-prompts/VisualPromptActions";
import type { CursorVisualPromptRequest } from "@/features/cursor-visual-prompts/contract";
import { CursorPromptEditor } from "@/features/cursor-title-generator/CursorPromptEditor";
import {
  VISUAL_PROMPT_ASPECT_RATIO,
  VISUAL_PROMPT_DURATION,
  VISUAL_PROMPT_SCRIPT,
  VISUAL_PROMPT_SECTION,
  VISUAL_PROMPT_TITLE,
  VISUAL_PROMPT_TOPIC,
} from "@/features/cursor-title-generator/prompt";
import { VideoPreviewModal } from "@/components/create/VideoPreviewModal";
import { useVoiceoverPreview } from "@/components/create/useVoiceoverPreview";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { buildClipPoster, clipKindFor } from "@/lib/clipPoster";
import { deleteClip, pruneClips, putClip } from "@/lib/clipStore";
import { deleteSceneClipFile } from "@/lib/storage/sceneClipUpload";
import { sceneVisualPreviewSrc } from "@/lib/sceneVisualImage";
import { spokenVoiceoverText } from "@/lib/sceneVoiceover";
import { scenesFromScript } from "@/lib/scenesFromScript";
import { timelineSectionsFromScript } from "@/lib/scriptSections";
import { trackSessionEvent } from "@/lib/session/telemetry";
import { readProjectStore } from "@/lib/useVideoProjectDraft";
import {
  createEmptyScene,
  formatTimecode,
  newId,
  sceneDuration,
  selectedTitle,
  totalTimelineSeconds,
  type Scene,
  type VideoProject,
} from "@/lib/videoProject";

const TIMELINE_GENERATORS = ["chatgpt", "gemini", "cursor"] as const;
type TimelineGenerator = (typeof TIMELINE_GENERATORS)[number];
const TIMELINE_GENERATOR_LABELS: Record<TimelineGenerator, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  cursor: "Cursor",
};

const CLIP_ACCEPT = "image/*,video/*";
const MAX_CLIP_BYTES = 100 * 1024 * 1024;
const DEFAULT_CLIP_SECONDS = 8;

type PreviewTarget =
  | { mode: "cut"; sceneId?: string }
  | { mode: "visual"; id: string };

type ScriptNotice = "missing" | "unreadable";

function sceneHasUploadedClip(scene: Scene): boolean {
  return Boolean(
    scene.visuals.uploadedClipStoragePath ||
      scene.visuals.uploadedClipUrl ||
      scene.visuals.uploadedClipId,
  );
}

async function deleteUploadedSceneClips(sessionId: string, scenes: Scene[]): Promise<void> {
  const uploaded = scenes.filter(sceneHasUploadedClip);
  await Promise.all(
    uploaded.map(async (scene) => {
      const storagePath = scene.visuals.uploadedClipStoragePath;
      if (storagePath) await deleteSceneClipFile(sessionId, scene.id, storagePath);
    }),
  );
  await Promise.all(
    uploaded.map(async (scene) => {
      const clipId = scene.visuals.uploadedClipId;
      if (clipId) await deleteClip(clipId);
    }),
  );
}

function clipSeconds(scene: Scene): number {
  const raw =
    scene.editing.durationSeconds && scene.editing.durationSeconds > 0
      ? scene.editing.durationSeconds
      : sceneDuration(scene);
  return Math.max(1, Math.round(raw));
}

function scenesWithVisualPrompts(
  scenes: Scene[],
  prompts: Array<{ id: string; prompt: string }>,
): Scene[] {
  const byId = new Map(
    prompts.flatMap((item) => {
      const prompt = item.prompt.trim();
      return prompt ? [[item.id, prompt] as const] : [];
    }),
  );
  return scenes.map((scene) => {
    const prompt = byId.get(scene.id);
    if (!prompt) return scene;
    return {
      ...scene,
      status: "generated",
      visuals: { ...scene.visuals, description: prompt },
    };
  });
}

function visualScene(scene: Scene, order: number) {
  return {
    id: scene.id,
    section: scene.sectionLabel.trim(),
    script: scene.finalScript.trim(),
    durationSeconds: clipSeconds(scene),
    order,
    existingPrompt: scene.visuals.description.trim() || null,
  };
}

function visualRequest(
  targets: Scene[],
  project: VideoProject,
): CursorVisualPromptRequest | null {
  const sequence = project.scenes
    .filter((scene) => scene.sectionLabel.trim() && scene.finalScript.trim())
    .map((scene, index) => visualScene(scene, index + 1));
  const targetIds = new Set(targets.map((scene) => scene.id));
  const scenes = sequence.filter((scene) => targetIds.has(scene.id));
  if (scenes.length === 0) return null;
  return {
    topic: project.summary.topic.trim(),
    title: selectedTitle(project)?.text.trim() ?? "",
    aspectRatio: project.summary.aspectRatio,
    scenes,
    sequence,
  };
}

const SCRIPT_NOTICE: Record<ScriptNotice, { title: string; message: string }> = {
  missing: {
    title: "No script yet",
    message:
      "Nothing was created in the previous step. Please create a script there, then break it into scenes.",
  },
  unreadable: {
    title: "Script can't be split",
    message:
      "The script in the previous step needs a heading and spoken lines for each scene. Generate or edit the script there, then try again.",
  },
};

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l1.4 5.2L18.5 9 13.4 10.3 12 15.5 10.6 10.3 5.5 9l5.1-1.3L12 2.5z" />
      <path d="M18 14.5l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 20h4l10.2-10.2a1.8 1.8 0 0 0 0-2.5l-1.5-1.5a1.8 1.8 0 0 0-2.5 0L4 16v4z" strokeLinejoin="round" />
      <path d="M13 6.5l4.5 4.5" strokeLinecap="round" />
    </svg>
  );
}

export function TimelineStep() {
  const { project, dispatch, previewOpen } = useVideoProject();
  const voiceover = useVoiceoverPreview();
  const elevenLabs = useElevenLabsPreview();
  const [selectedId, setSelectedId] = useState(project.scenes[0]?.id ?? "");
  const [view, setView] = useState<"strip" | "chart">("chart");
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const [scriptNotice, setScriptNotice] = useState<ScriptNotice | null>(null);
  const [generator, setGenerator] = useState<TimelineGenerator>("cursor");
  const [missingProvider, setMissingProvider] = useState<Exclude<TimelineGenerator, "cursor"> | null>(
    null,
  );
  const clipsRef = useRef<HTMLInputElement>(null);
  const [uploadingClips, setUploadingClips] = useState(false);
  const [clipError, setClipError] = useState<string | null>(null);
  const [pendingBreak, setPendingBreak] = useState<"blocks" | "chart" | null>(null);
  const [rebreakError, setRebreakError] = useState<string | null>(null);
  const breakingRef = useRef(false);
  const [breaking, setBreaking] = useState(false);
  const visualGeneration = useCursorVisualPromptGeneration();
  const generateLocked = visualGeneration.generating;
  const chartBusy =
    visualGeneration.generatingId === "all"
      ? "all-visuals"
      : visualGeneration.generatingId
        ? `visuals:${visualGeneration.generatingId}`
        : null;

  // A clip upload must not stretch the scene. Put the script's length back if it was replaced.
  useEffect(() => {
    const sections = timelineSectionsFromScript(project.fullScript);
    if (!sections || project.scenes.length === 0) return;
    let changed = false;
    const next = project.scenes.map((scene) => {
      const match = sections.find((section) => section.label === scene.sectionLabel);
      const locked = match?.durationSeconds;
      if (!locked || locked <= 0) return scene;
      if (
        scene.editing.scriptDurationSeconds === locked &&
        scene.editing.durationSeconds === locked
      ) {
        return scene;
      }
      changed = true;
      return {
        ...scene,
        editing: {
          ...scene.editing,
          scriptDurationSeconds: locked,
          durationSeconds: locked,
        },
      };
    });
    if (!changed) return;
    dispatch({ type: "SET_SCENES", scenes: next, generated: true, keepStatus: true });
  }, [project.fullScript, project.scenes, dispatch]);

  // Drop blobs left behind by deleted scenes or drafts.
  useEffect(() => {
    const keep = new Set<string>();
    for (const item of readProjectStore().projects) {
      for (const scene of item.scenes) {
        if (scene.visuals.uploadedClipId) keep.add(scene.visuals.uploadedClipId);
      }
    }
    void pruneClips(keep);
  }, []);

  useEffect(() => {
    if (!previewOpen) return;
    elevenLabs.stop();
  }, [previewOpen, elevenLabs.stop]);

  const selected =
    project.scenes.find((scene) => scene.id === selectedId) ?? project.scenes[0] ?? null;

  function applyBreak(style: "blocks" | "chart") {
    const scenes = scenesFromScript(project.fullScript.trim());
    if (!scenes) {
      setScriptNotice("unreadable");
      return;
    }
    dispatch({ type: "SET_SCENES", scenes, generated: true });
    setSelectedId(scenes[0]?.id ?? "");
    if (style === "chart") setView("chart");
  }

  function breakIntoScenes(style: "blocks" | "chart") {
    const script = project.fullScript.trim();
    if (!script) {
      setScriptNotice("missing");
      return;
    }
    if (!scenesFromScript(script)) {
      setScriptNotice("unreadable");
      return;
    }
    if (project.scenes.some(sceneHasUploadedClip)) {
      setRebreakError(null);
      setPendingBreak(style);
      return;
    }
    applyBreak(style);
  }

  async function confirmRebreak() {
    const style = pendingBreak;
    if (!style || breakingRef.current) return;
    breakingRef.current = true;
    setBreaking(true);
    setRebreakError(null);
    try {
      await deleteUploadedSceneClips(project.id, project.scenes);
      setPendingBreak(null);
      applyBreak(style);
    } catch (cause) {
      setRebreakError(
        cause instanceof Error ? cause.message : "Could not delete the uploaded clips.",
      );
    } finally {
      breakingRef.current = false;
      setBreaking(false);
    }
  }

  function requireCursor(): boolean {
    if (generator === "cursor") return true;
    setMissingProvider(generator);
    return false;
  }

  async function generateVisuals(id: string) {
    if (!requireCursor()) return;
    const scene = project.scenes.find((item) => item.id === id);
    if (!scene) return;
    const request = visualRequest([scene], project);
    if (!request) {
      visualGeneration.setError("Add a spoken script for this scene before generating a visual prompt.");
      return;
    }
    const result = await visualGeneration.generate(request);
    if (!result?.prompts.some((item) => item.id === id && item.prompt.trim())) return;
    dispatch({
      type: "SET_SCENES",
      scenes: scenesWithVisualPrompts(project.scenes, result.prompts),
      generated: true,
      keepStatus: true,
    });
    dispatch({
      type: "RECORD_API_COST",
      entry: {
        id: newId(),
        at: new Date().toISOString(),
        step: "timeline",
        provider: "cursor",
        kind: "visualPrompt",
        usd: 0,
      },
    });
  }

  async function generateAllVisuals() {
    if (!requireCursor()) return;
    const request = visualRequest(project.scenes, project);
    if (!request) {
      visualGeneration.setError("Add a spoken script before generating visual prompts.");
      return;
    }
    const result = await visualGeneration.generate(request);
    if (!result) return;
    dispatch({
      type: "SET_SCENES",
      scenes: scenesWithVisualPrompts(project.scenes, result.prompts),
      generated: true,
      keepStatus: true,
    });
    dispatch({
      type: "RECORD_API_COST",
      entry: {
        id: newId(),
        at: new Date().toISOString(),
        step: "timeline",
        provider: "cursor",
        kind: "visualPrompts",
        usd: 0,
      },
    });
  }

  function previewVoiceover(id: string) {
    elevenLabs.stop();
    const scene = project.scenes.find((item) => item.id === id);
    if (!scene) return;
    voiceover.preview(scene);
  }

  function previewElevenLabs(id: string) {
    const scene = project.scenes.find((item) => item.id === id);
    const voiceId = project.elevenLabsVoice?.voiceId;
    if (!scene || !voiceId) return;
    const text = spokenVoiceoverText(scene.finalScript);
    if (!text || text.length > MAX_PREVIEW_CHARS) return;
    voiceover.stop();
    void elevenLabs.preview(scene.id, text, voiceId, clipSeconds(scene));
  }

  function previewVisual(id: string) {
    voiceover.stop();
    elevenLabs.stop();
    const scene = project.scenes.find((item) => item.id === id);
    if (
      scene?.visuals.uploadedClipKind === "video" &&
      (scene.visuals.uploadedClipUrl || scene.visuals.uploadedClipId)
    ) {
      setPreview({ mode: "cut", sceneId: id });
      return;
    }
    setPreview({ mode: "visual", id });
  }

  async function uploadClips(files: File[]) {
    setClipError(null);
    const usable = files.filter((file) => file.size <= MAX_CLIP_BYTES);
    if (usable.length === 0) {
      setClipError("Clips must be under 100MB.");
      return;
    }

    setUploadingClips(true);
    try {
      const added: Scene[] = [];
      for (const file of usable) {
        const clipId = await putClip(file);
        if (!clipId) {
          setClipError("Could not store those clips on this device.");
          break;
        }
        const { poster, durationSeconds } = await buildClipPoster(file);
        const scene = createEmptyScene(project.scenes.length + added.length, {
          sectionLabel: file.name,
        });
        scene.visuals = {
          ...scene.visuals,
          uploadedClipId: clipId,
          uploadedClipName: file.name,
          uploadedClipKind: clipKindFor(file),
          uploadedClipDurationSeconds: durationSeconds,
          thumbnailUrl: poster,
          description: file.name,
          needsCustomFootage: true,
        };
        // Floor, never round: a scene must not open already longer than its source.
        scene.editing.durationSeconds = durationSeconds
          ? Math.max(1, Math.floor(durationSeconds * 10) / 10)
          : DEFAULT_CLIP_SECONDS;
        added.push(scene);
        trackSessionEvent(project.id, {
          type: "asset.clip_added",
          step: "timeline",
          payload: {
            sceneKey: scene.id,
            localClipId: clipId,
            fileName: file.name,
            mimeType: file.type || null,
            sizeBytes: file.size,
            durationSec: durationSeconds,
          },
        });
      }

      if (added.length > 0) {
        dispatch({ type: "SET_SCENES", scenes: [...project.scenes, ...added] });
        setSelectedId(added[0]?.id ?? "");
        setView("chart");
      }
      if (usable.length < files.length) {
        setClipError("Some clips were skipped — each must be under 100MB.");
      }
    } finally {
      setUploadingClips(false);
    }
  }

  const total = totalTimelineSeconds(project.scenes);
  const notice = scriptNotice ? SCRIPT_NOTICE[scriptNotice] : null;

  return (
    <FieldFlash field="timeline" className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-display text-lg font-semibold text-foreground">Timeline / scenes</h3>
        <p className="mt-1 text-sm text-muted">
          Break the script from the previous step into scenes. Each scene keeps its timing, section
          name, and spoken lines.
        </p>
        <div className="mt-4">
          <GenerateBar
            providers={TIMELINE_GENERATORS}
            provider={generator}
            providerLabels={TIMELINE_GENERATOR_LABELS}
            showProviderIcons
            onProviderChange={setGenerator}
            onGenerate={() => breakIntoScenes("blocks")}
            generating={false}
            hasOutput={project.scenes.length > 0}
            generateLabel="Break into scenes"
            regenerateLabel="Re-break into scenes"
            extra={
              <>
                <ActionButton variant="secondary" onClick={() => breakIntoScenes("chart")}>
                  Break into chart
                </ActionButton>
                <ActionButton variant="secondary" onClick={() => dispatch({ type: "ADD_SCENE" })}>
                  Add scene
                </ActionButton>
                <input
                  ref={clipsRef}
                  type="file"
                  accept={CLIP_ACCEPT}
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    if (files.length > 0) void uploadClips(files);
                    event.target.value = "";
                  }}
                />
                <ActionButton
                  variant="secondary"
                  loading={uploadingClips}
                  loadingLabel="Uploading…"
                  onClick={() => clipsRef.current?.click()}
                >
                  Upload clips
                </ActionButton>
                <LowEffortCheck scope="timeline" variant="button" />
              </>
            }
          />
          <StepFixModal
            open={notice !== null}
            step="script"
            title={notice?.title ?? "No script yet"}
            message={notice?.message ?? ""}
            onClose={() => setScriptNotice(null)}
          />
          <StepFixModal
            open={missingProvider !== null}
            step="timeline"
            title={`${missingProvider === "gemini" ? "Gemini" : "ChatGPT"} isn't integrated yet`}
            message="Select Cursor to generate with the local Cursor CLI."
            onClose={() => setMissingProvider(null)}
          />
          <ConfirmModal
            open={pendingBreak !== null}
            title="Re-break these scenes?"
            description={
              rebreakError
                ? `${rebreakError} The current scenes are still here.`
                : "This replaces the current timeline with new scenes from the script. Every uploaded video is permanently deleted from storage and the database first, and cannot be retrieved."
            }
            confirmLabel={breaking ? "Deleting clips…" : "Delete clips and re-break"}
            onClose={() => {
              if (breaking) return;
              setPendingBreak(null);
              setRebreakError(null);
            }}
            onConfirm={() => void confirmRebreak()}
          />
        </div>
      </div>
      {clipError ? <p className="text-sm text-accent">{clipError}</p> : null}
      <LowEffortCheck scope="timeline" variant="report" />

      {project.scenes.length === 0 ? (
        <EmptyState
          title="No scenes yet"
          description={
            project.fullScript
              ? "Break the script into scenes. Each scene shows its timing, section name, and spoken lines."
              : "Create a script in the previous step, then break it into scenes."
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-xl border border-border bg-surface-soft p-1">
              <button
                type="button"
                onClick={() => setView("strip")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  view === "strip"
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:bg-white/5 hover:text-foreground"
                }`}
              >
                Scene strip
              </button>
              <button
                type="button"
                onClick={() => setView("chart")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  view === "chart"
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:bg-white/5 hover:text-foreground"
                }`}
              >
                Chart
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ElevenLabsVoiceSelect
                value={project.elevenLabsVoice}
                onChange={(voice) => {
                  elevenLabs.stop();
                  dispatch({ type: "SET_ELEVENLABS_VOICE", voice });
                }}
              />
              <ActionButton
                size="sm"
                variant="secondary"
                loading={chartBusy === "all-visuals"}
                loadingLabel="Generating…"
                disabled={generateLocked && chartBusy !== "all-visuals"}
                onClick={() => void generateAllVisuals()}
              >
                <SparkIcon />
                Generate all visuals
              </ActionButton>
              <CursorPromptEditor
                kind="visualPromptGeneration"
                enabled={visualGeneration.enabled}
                standalone
                label="Cursor visual editing prompt"
                icon={<PencilIcon />}
                variables={[
                  { token: VISUAL_PROMPT_SECTION, value: selected?.sectionLabel ?? "" },
                  { token: VISUAL_PROMPT_SCRIPT, value: selected?.finalScript ?? "" },
                  {
                    token: VISUAL_PROMPT_DURATION,
                    value: selected ? String(clipSeconds(selected)) : "",
                  },
                  { token: VISUAL_PROMPT_ASPECT_RATIO, value: project.summary.aspectRatio },
                  { token: VISUAL_PROMPT_TOPIC, value: project.summary.topic },
                  { token: VISUAL_PROMPT_TITLE, value: selectedTitle(project)?.text ?? "" },
                ]}
              />
              <ActionButton
                size="sm"
                onClick={() => {
                  voiceover.stop();
                  elevenLabs.stop();
                  setPreview({ mode: "cut" });
                }}
              >
                Preview all
              </ActionButton>
              <p className="text-xs tabular-nums text-muted">
                Runtime {formatTimecode(total)}
              </p>
            </div>
          </div>

          {voiceover.error ? (
            <p className="text-sm text-accent">{voiceover.error}</p>
          ) : null}
          {elevenLabs.error ? (
            <p className="text-sm text-accent">{elevenLabs.error}</p>
          ) : null}
          {visualGeneration.error ? (
            <p className="rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">
              {visualGeneration.error}
            </p>
          ) : null}

          {view === "chart" ? (
            <TimelineChart
              scenes={project.scenes}
              selectedId={selected?.id ?? null}
              busy={chartBusy}
              generateLocked={generateLocked}
              onSelect={setSelectedId}
              onGenerateVisuals={generateVisuals}
              onPreviewScript={previewVoiceover}
              onPreviewVisuals={previewVisual}
              scriptPlayingId={voiceover.playingId}
              elevenLabsPlayingId={elevenLabs.playingId}
              elevenLabsLoadingId={elevenLabs.loadingId}
              elevenLabsDisabled={!project.elevenLabsVoice}
              elevenLabsDurations={elevenLabs.durations}
              onElevenLabsPreview={previewElevenLabs}
            />
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-4">
              <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
                {project.scenes.map((scene) => (
                  <SceneCard
                    key={scene.id}
                    scene={scene}
                    selected={selected?.id === scene.id}
                    onSelect={() => setSelectedId(scene.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {selected ? (
            <div className="flex flex-wrap gap-2">
              <ActionButton
                size="sm"
                variant="secondary"
                onClick={() => dispatch({ type: "MOVE_SCENE", id: selected.id, direction: "up" })}
                disabled={selected.order === 0}
              >
                Move up
              </ActionButton>
              <ActionButton
                size="sm"
                variant="secondary"
                onClick={() =>
                  dispatch({ type: "MOVE_SCENE", id: selected.id, direction: "down" })
                }
                disabled={selected.order === project.scenes.length - 1}
              >
                Move down
              </ActionButton>
              <ActionButton
                size="sm"
                variant="danger"
                onClick={() => {
                  const index = selected.order;
                  dispatch({ type: "DELETE_SCENE", id: selected.id });
                  const remaining = project.scenes.filter((scene) => scene.id !== selected.id);
                  const next = remaining[Math.max(0, index - 1)] ?? remaining[0];
                  setSelectedId(next?.id ?? "");
                }}
              >
                Delete scene
              </ActionButton>
            </div>
          ) : null}

          {view === "strip" && selected ? (
            <div className="grid gap-4 rounded-2xl border border-border bg-surface p-5 lg:grid-cols-2">
              <SceneBeatFields
                scene={selected}
                column="script"
                labeled
                previewing={voiceover.playingId === selected.id}
                previewDisabled={!selected.finalScript.trim()}
                onPreview={() => previewVoiceover(selected.id)}
                elevenLabsPlaying={elevenLabs.playingId === selected.id}
                elevenLabsLoading={elevenLabs.loadingId === selected.id}
                elevenLabsDisabled={
                  !project.elevenLabsVoice ||
                  spokenVoiceoverText(selected.finalScript).length > MAX_PREVIEW_CHARS
                }
                elevenLabsVoiceSeconds={elevenLabs.durations[selected.id] ?? null}
                onElevenLabsPreview={() => previewElevenLabs(selected.id)}
              />
              <SceneBeatFields
                scene={selected}
                column="visuals"
                labeled
                generating={chartBusy === `visuals:${selected.id}` || chartBusy === "all-visuals"}
                generateDisabled={
                  generateLocked && chartBusy !== `visuals:${selected.id}` && chartBusy !== "all-visuals"
                }
                previewDisabled={!sceneVisualPreviewSrc(selected.visuals)}
                onGenerate={() => generateVisuals(selected.id)}
                onPreview={() => previewVisual(selected.id)}
              />
            </div>
          ) : null}
        </>
      )}

      <VideoPreviewModal
        open={preview?.mode === "cut"}
        sceneId={preview?.mode === "cut" ? preview.sceneId : undefined}
        onClose={() => setPreview(null)}
      />
      <SceneVisualPreviewModal
        open={preview?.mode === "visual"}
        scene={
          preview?.mode === "visual"
            ? (project.scenes.find((scene) => scene.id === preview.id) ?? null)
            : null
        }
        onClose={() => setPreview(null)}
      />
    </FieldFlash>
  );
}
