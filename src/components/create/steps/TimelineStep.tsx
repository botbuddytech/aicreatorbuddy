"use client";

import { useMemo, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { GenerateBar } from "@/components/create/GenerateBar";
import { LowEffortCheck } from "@/components/create/LowEffortCheck";
import { SceneBeatFields } from "@/components/create/scene/SceneBeatFields";
import { SceneCard } from "@/components/create/scene/SceneCard";
import { SceneVisualPreviewModal } from "@/components/create/scene/SceneVisualPreviewModal";
import { TimelineChart } from "@/components/create/scene/TimelineChart";
import { VideoPreviewModal } from "@/components/create/VideoPreviewModal";
import { usePipelineGeneration } from "@/components/create/useGeneration";
import { useVoiceoverPreview } from "@/components/create/useVoiceoverPreview";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { mockGenerate, summaryPrompt } from "@/lib/mockAi";
import { sceneVisualPreviewSrc } from "@/lib/sceneVisualImage";
import {
  buildScenePrompt,
  formatTimecode,
  providersForStep,
  selectedTitle,
  totalTimelineSeconds,
  type Scene,
  type VideoProject,
} from "@/lib/videoProject";

type PreviewTarget = { mode: "cut" } | { mode: "visual"; id: string };

function scriptPromptFor(scene: Scene, project: VideoProject) {
  return buildScenePrompt(
    scene,
    project,
    [
      scene.sectionLabel ? `Section: ${scene.sectionLabel}` : "",
      scene.finalScript.trim() ? `Current script:\n${scene.finalScript}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

function visualsPromptFor(scene: Scene, project: VideoProject) {
  return buildScenePrompt(
    scene,
    project,
    [
      scene.sectionLabel ? `Section: ${scene.sectionLabel}` : "",
      scene.finalScript.trim() ? `Spoken script:\n${scene.finalScript}` : "",
      scene.visuals.description.trim() ? `Current visuals:\n${scene.visuals.description}` : "",
      scene.editing.notes.trim() ? `Editing notes:\n${scene.editing.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

export function TimelineStep() {
  const { project, dispatch } = useVideoProject();
  const { busy, error, generate, recordCost, run } = usePipelineGeneration();
  const voiceover = useVoiceoverPreview();
  const [selectedId, setSelectedId] = useState(project.scenes[0]?.id ?? "");
  const [view, setView] = useState<"strip" | "chart">("chart");
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const provider = project.providerByStep.timeline ?? "chatgpt";
  const generateLocked = Boolean(busy);

  const selected =
    project.scenes.find((scene) => scene.id === selectedId) ?? project.scenes[0] ?? null;

  const prompt = useMemo(() => {
    const title = selectedTitle(project)?.text;
    return [summaryPrompt(project.summary), title ? `Selected title: ${title}` : ""]
      .filter(Boolean)
      .join("\n");
  }, [project]);

  async function breakIntoScenes(style: "blocks" | "chart") {
    if (!project.fullScript.trim() && style === "blocks") return;
    const source = project.fullScript.trim()
      ? project.fullScript
      : `HOOK\nCold open on ${project.summary.topic || "the idea"}.\n\nINTRO\nPromise the experiment.\n\nPOINT 1\nMotivation isn't the problem.\n\nPOINT 2\nBuild the system around the viewer.`;
    const scenes = await generate(
      style,
      "scenes",
      { fullScript: source, prompt, style },
      provider,
      "timeline",
    );
    if (scenes) {
      dispatch({ type: "SET_SCENES", scenes });
      setSelectedId(scenes[0]?.id ?? "");
      if (style === "chart") setView("chart");
    }
  }

  async function generateScript(id: string) {
    const scene = project.scenes.find((item) => item.id === id);
    if (!scene) return;
    const result = await generate(
      `script:${id}`,
      "sceneScript",
      { prompt: scriptPromptFor(scene, project) },
      provider,
      "timeline",
    );
    if (result?.trim()) {
      dispatch({
        type: "PATCH_SCENE",
        id,
        patch: { finalScript: result, status: "generated" },
      });
    }
  }

  async function generateVisuals(id: string) {
    const scene = project.scenes.find((item) => item.id === id);
    if (!scene) return;
    const result = await generate(
      `visuals:${id}`,
      "sceneVisuals",
      { prompt: visualsPromptFor(scene, project) },
      provider,
      "timeline",
    );
    if (result?.description.trim()) {
      dispatch({
        type: "PATCH_SCENE",
        id,
        patch: {
          visuals: { description: result.description, thumbnailUrl: result.thumbnailUrl },
          status: "generated",
        },
      });
    }
  }

  async function generateAllScripts() {
    const scenes = project.scenes;
    await run("all-scripts", async () => {
      for (const scene of scenes) {
        try {
          const result = await mockGenerate(
            "sceneScript",
            { prompt: scriptPromptFor(scene, project) },
            provider,
          );
          if (result.trim()) {
            dispatch({
              type: "PATCH_SCENE",
              id: scene.id,
              patch: { finalScript: result, status: "generated" },
            });
            recordCost(
              "sceneScript",
              { prompt: scriptPromptFor(scene, project) },
              provider,
              "timeline",
            );
          }
        } catch {
          /* keep prior text */
        }
      }
      return true;
    });
  }

  async function generateAllVisuals() {
    const scenes = project.scenes;
    await run("all-visuals", async () => {
      for (const scene of scenes) {
        try {
          const result = await mockGenerate(
            "sceneVisuals",
            { prompt: visualsPromptFor(scene, project) },
            provider,
          );
          if (result.description.trim()) {
            dispatch({
              type: "PATCH_SCENE",
              id: scene.id,
              patch: {
                visuals: { description: result.description, thumbnailUrl: result.thumbnailUrl },
                status: "generated",
              },
            });
            recordCost(
              "sceneVisuals",
              { prompt: visualsPromptFor(scene, project) },
              provider,
              "timeline",
            );
          }
        } catch {
          /* keep prior text */
        }
      }
      return true;
    });
  }

  function previewVoiceover(id: string) {
    const scene = project.scenes.find((item) => item.id === id);
    if (!scene) return;
    voiceover.preview(scene);
  }

  const total = totalTimelineSeconds(project.scenes);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-display text-lg font-semibold text-foreground">Timeline / scenes</h3>
        <p className="mt-1 text-sm text-muted">
          Edit each beat’s script and visuals, generate with AI, then listen to a voiceover or
          preview the still.
        </p>
        <div className="mt-4">
          <GenerateBar
            providers={providersForStep("timeline")}
            provider={provider}
            onProviderChange={(next) =>
              dispatch({ type: "SET_PROVIDER", step: "timeline", provider: next })
            }
            onGenerate={() => breakIntoScenes("blocks")}
            generating={busy === "blocks"}
            hasOutput={project.scenes.length > 0}
            generateLabel="Break into scenes"
            regenerateLabel="Re-break into scenes"
            error={error}
            extra={
              <>
                <ActionButton
                  variant="secondary"
                  loading={busy === "chart"}
                  loadingLabel="Building chart…"
                  onClick={() => breakIntoScenes("chart")}
                >
                  Break into chart
                </ActionButton>
                <ActionButton variant="secondary" onClick={() => dispatch({ type: "ADD_SCENE" })}>
                  Add scene
                </ActionButton>
                <LowEffortCheck scope="timeline" variant="button" />
              </>
            }
          />
        </div>
      </div>
      <LowEffortCheck scope="timeline" variant="report" />

      {project.scenes.length === 0 ? (
        <EmptyState
          title="No scenes yet"
          description={
            project.fullScript
              ? "Break the script into scenes, or break into a timed production chart."
              : "Generate a script first, or break into a chart from the introduction."
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
              <ActionButton
                size="sm"
                variant="secondary"
                loading={busy === "all-scripts"}
                loadingLabel="Generating…"
                disabled={generateLocked && busy !== "all-scripts"}
                onClick={generateAllScripts}
              >
                Generate all scripts
              </ActionButton>
              <ActionButton
                size="sm"
                variant="secondary"
                loading={busy === "all-visuals"}
                loadingLabel="Generating…"
                disabled={generateLocked && busy !== "all-visuals"}
                onClick={generateAllVisuals}
              >
                Generate all visuals
              </ActionButton>
              <ActionButton
                size="sm"
                onClick={() => {
                  voiceover.stop();
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

          {view === "chart" ? (
            <TimelineChart
              scenes={project.scenes}
              selectedId={selected?.id ?? null}
              busy={busy}
              generateLocked={generateLocked}
              onSelect={setSelectedId}
              onGenerateScript={generateScript}
              onGenerateVisuals={generateVisuals}
              onPreviewScript={previewVoiceover}
              onPreviewVisuals={(id) => {
                voiceover.stop();
                setPreview({ mode: "visual", id });
              }}
              scriptPlayingId={voiceover.playingId}
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
                generating={busy === `script:${selected.id}`}
                generateDisabled={generateLocked && busy !== `script:${selected.id}`}
                previewing={voiceover.playingId === selected.id}
                previewDisabled={!selected.finalScript.trim()}
                onGenerate={() => generateScript(selected.id)}
                onPreview={() => previewVoiceover(selected.id)}
              />
              <SceneBeatFields
                scene={selected}
                column="visuals"
                labeled
                generating={busy === `visuals:${selected.id}`}
                generateDisabled={generateLocked && busy !== `visuals:${selected.id}`}
                previewDisabled={!sceneVisualPreviewSrc(selected.visuals)}
                onGenerate={() => generateVisuals(selected.id)}
                onPreview={() => {
                  voiceover.stop();
                  setPreview({ mode: "visual", id: selected.id });
                }}
              />
            </div>
          ) : null}
        </>
      )}

      <VideoPreviewModal
        open={preview?.mode === "cut"}
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
    </div>
  );
}
