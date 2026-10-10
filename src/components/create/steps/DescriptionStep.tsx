"use client";

import { useMemo, useState } from "react";
import { FieldFlash } from "@/components/agent/FieldFlash";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { ActionButton } from "@/components/ui/ActionButton";
import { Modal } from "@/components/ui/Modal";
import { GenerateBar } from "@/components/create/GenerateBar";
import { StepFixModal } from "@/components/create/StepFixModal";
import { usePipelineGeneration } from "@/components/create/useGeneration";
import { useFilteredGenerators } from "@/components/create/useFilteredGenerators";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { useCursorDescriptionGeneration } from "@/features/cursor-description-generator/DescriptionActions";
import { CursorPromptEditor } from "@/features/cursor-title-generator/CursorPromptEditor";
import {
  applyDescriptionPromptVariables,
  DEFAULT_CURSOR_DESCRIPTION_PROMPT,
  DESCRIPTION_PROMPT_LENGTH,
  DESCRIPTION_PROMPT_ORIENTATION,
  DESCRIPTION_PROMPT_REFERENCES,
  DESCRIPTION_PROMPT_SCRIPT,
  DESCRIPTION_PROMPT_SUMMARY,
  DESCRIPTION_PROMPT_TITLE,
  DESCRIPTION_PROMPT_TOPIC,
  DESCRIPTION_PROMPT_VIDEO_TYPE,
  formatReferenceTranscripts,
} from "@/features/cursor-title-generator/prompt";
import { summaryPrompt } from "@/lib/mockAi";
import {
  FORMAT_LABELS,
  INTENT_LABELS,
  formatDurationLabel,
  selectedTitle,
} from "@/lib/videoProject";

const DESCRIPTION_GENERATORS = ["chatgpt", "gemini", "cursor", "vidiq"] as const;
type DescriptionGenerator = (typeof DESCRIPTION_GENERATORS)[number];
const DESCRIPTION_GENERATOR_LABELS: Record<DescriptionGenerator, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  cursor: "Cursor",
  vidiq: "vidIQ",
};

export function DescriptionStep() {
  const { project, dispatch } = useVideoProject();
  const { busy, error, generate: runGenerate } = usePipelineGeneration();
  const [generator, setGenerator] = useState<DescriptionGenerator>("cursor");
  const [missingProvider, setMissingProvider] = useState<
    Exclude<DescriptionGenerator, "cursor"> | null
  >(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const descriptionGenerators = useFilteredGenerators(
    DESCRIPTION_GENERATORS,
    generator,
    setGenerator,
  );

  const title = selectedTitle(project)?.text.trim() ?? "";
  const descriptionRequest = useMemo(() => {
    const refs = project.summary.references
      .filter((reference) => reference.title.trim() || reference.transcript.trim())
      .map((reference) => ({
        title: reference.title.trim(),
        transcript: reference.transcript.trim(),
      }));
    return {
      topic: project.summary.topic.trim(),
      title,
      length: formatDurationLabel(project.summary.durationSeconds, project.summary.format),
      orientation: `${FORMAT_LABELS[project.summary.format]} (${project.summary.aspectRatio})`,
      videoType: INTENT_LABELS[project.summary.intent],
      script: project.fullScript.trim(),
      summary: summaryPrompt(project.summary),
      references: refs,
    };
  }, [project.summary, project.fullScript, title]);
  const mockPrompt = useMemo(
    () => applyDescriptionPromptVariables(DEFAULT_CURSOR_DESCRIPTION_PROMPT, descriptionRequest),
    [descriptionRequest],
  );
  const promptVariables = [
    { token: DESCRIPTION_PROMPT_SUMMARY, value: descriptionRequest.summary },
    { token: DESCRIPTION_PROMPT_TITLE, value: descriptionRequest.title },
    { token: DESCRIPTION_PROMPT_SCRIPT, value: descriptionRequest.script },
    { token: DESCRIPTION_PROMPT_TOPIC, value: descriptionRequest.topic },
    { token: DESCRIPTION_PROMPT_LENGTH, value: descriptionRequest.length },
    { token: DESCRIPTION_PROMPT_ORIENTATION, value: descriptionRequest.orientation },
    { token: DESCRIPTION_PROMPT_VIDEO_TYPE, value: descriptionRequest.videoType },
    {
      token: DESCRIPTION_PROMPT_REFERENCES,
      value: formatReferenceTranscripts(descriptionRequest.references),
    },
  ];

  const cursorGeneration = useCursorDescriptionGeneration({
    request: descriptionRequest,
    onDescription: (description, tags, promptUsed) => {
      dispatch({
        type: "SET_DESCRIPTION",
        description,
        tags,
        cursorPrompt: promptUsed,
      });
      dispatch({ type: "SET_PROVIDER", step: "description", provider: "cursor" });
    },
  });

  const generating = cursorGeneration.generating || busy === "desc";

  async function generate() {
    if (generator === "cursor") {
      void cursorGeneration.generate();
      return;
    }
    if (generator === "chatgpt" || generator === "gemini") {
      const result = await runGenerate(
        "desc",
        "description",
        { prompt: mockPrompt, title },
        generator,
        "description",
      );
      if (result) {
        dispatch({
          type: "SET_DESCRIPTION",
          description: result.description,
          tags: result.tags,
          cursorPrompt: null,
        });
        dispatch({ type: "SET_PROVIDER", step: "description", provider: generator });
      }
      return;
    }
    setMissingProvider(generator);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-display text-lg font-semibold text-foreground">
          YouTube description
        </h3>
        <p className="mt-1 text-sm text-muted">
          Generate a description and tags from the video introduction, title, and script. Edit the
          prompt tokens or the draft before you approve this step.
        </p>
        <div className="mt-4">
          <GenerateBar
            providers={descriptionGenerators}
            provider={generator}
            providerLabels={DESCRIPTION_GENERATOR_LABELS}
            showProviderIcons
            onProviderChange={setGenerator}
            onGenerate={generate}
            generating={generating}
            hasOutput={project.description.length > 0}
            generateLabel="Generate description"
            regenerateLabel="Regenerate description"
            error={error ?? cursorGeneration.error}
            extra={
              <CursorPromptEditor
                kind="descriptionGeneration"
                enabled={cursorGeneration.enabled}
                standalone
                label="Edit Cursor prompt"
                variables={promptVariables}
              />
            }
          />
          <StepFixModal
            open={cursorGeneration.fixNotice !== null}
            step={cursorGeneration.fixNotice?.step ?? "summary"}
            title={cursorGeneration.fixNotice?.title ?? "Details needed"}
            message={cursorGeneration.fixNotice?.message ?? ""}
            onClose={() => cursorGeneration.setFixNotice(null)}
          />
          <StepFixModal
            open={missingProvider !== null}
            step="description"
            title={`${
              missingProvider === "gemini"
                ? "Gemini"
                : missingProvider === "vidiq"
                  ? "vidIQ"
                  : "ChatGPT"
            } isn't integrated yet`}
            message="Select Cursor to generate the description, or connect this integration on AI Integrations."
            onClose={() => setMissingProvider(null)}
          />
        </div>
      </div>

      {generating ? (
        <Skeleton className="h-64" />
      ) : (
        <FieldFlash field="description" className="rounded-2xl">
          {project.description ? (
            <div className="rounded-2xl border border-border bg-surface p-5">
              {project.cursorDescriptionPrompt ? (
                <div className="mb-3 flex justify-end">
                  <ActionButton size="sm" variant="secondary" onClick={() => setPromptOpen(true)}>
                    Prompt used
                  </ActionButton>
                </div>
              ) : null}
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Description
              </p>
              <Textarea
                className="mt-3 min-h-[18rem]"
                rows={14}
                value={project.description}
                onChange={(event) =>
                  dispatch({ type: "SET_DESCRIPTION", description: event.target.value })
                }
              />
              <div className="mt-4">
                <p className="mb-1.5 text-sm font-medium text-foreground">Tags</p>
                <Input
                  value={project.tags.join(", ")}
                  onChange={(event) =>
                    dispatch({
                      type: "SET_DESCRIPTION",
                      description: project.description,
                      tags: event.target.value
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="youtube growth, faceless, ai video"
                />
              </div>
            </div>
          ) : (
            <EmptyState
              title="No description yet"
              description="Generate copy from the introduction, selected title, and script."
            />
          )}
        </FieldFlash>
      )}

      <Modal
        open={promptOpen}
        size="lg"
        title="Prompt used"
        subtitle="The exact Cursor prompt that generated this description, with this video's values filled in. Edits in the draft are not written back into the prompt."
        onClose={() => setPromptOpen(false)}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {project.cursorDescriptionPrompt}
        </p>
      </Modal>
    </div>
  );
}
