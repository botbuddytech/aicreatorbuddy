"use client";

import { useRef, useState } from "react";
import { FieldFlash } from "@/components/agent/FieldFlash";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { ActionButton } from "@/components/ui/ActionButton";
import { Modal } from "@/components/ui/Modal";
import { GenerateBar } from "@/components/create/GenerateBar";
import { LowEffortCheck } from "@/components/create/LowEffortCheck";
import { IntroductionGlimpse, SavedTitleGlimpse } from "@/components/create/PriorStepGlimpse";
import { StepFixModal } from "@/components/create/StepFixModal";
import { useCursorScriptGeneration } from "@/features/cursor-script-generator/ScriptActions";
import { CursorPromptEditor } from "@/features/cursor-title-generator/CursorPromptEditor";
import {
  FORMAT_LABELS,
  INTENT_LABELS,
  formatDurationLabel,
  selectedTitle,
} from "@/lib/videoProject";
import {
  SCRIPT_PROMPT_LENGTH,
  SCRIPT_PROMPT_ORIENTATION,
  SCRIPT_PROMPT_REFERENCES,
  SCRIPT_PROMPT_TITLE,
  SCRIPT_PROMPT_TOPIC,
  SCRIPT_PROMPT_VIDEO_TYPE,
  formatReferenceTranscripts,
} from "@/features/cursor-title-generator/prompt";
import { useVideoProject } from "@/components/create/VideoProjectProvider";

const SCRIPT_FILE_ACCEPT = ".txt,.md,text/plain";
const SCRIPT_GENERATORS = ["chatgpt", "gemini", "cursor", "vidiq"] as const;
type ScriptGenerator = (typeof SCRIPT_GENERATORS)[number];
const SCRIPT_GENERATOR_LABELS: Record<ScriptGenerator, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  cursor: "Cursor",
  vidiq: "vidIQ",
};

function isAllowedScriptFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === "text/plain" ||
    file.type === "text/markdown" ||
    name.endsWith(".txt") ||
    name.endsWith(".md")
  );
}

export function ScriptStep() {
  const { project, dispatch, savedTitle } = useVideoProject();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [generator, setGenerator] = useState<ScriptGenerator>("cursor");
  const [missingProvider, setMissingProvider] = useState<Exclude<ScriptGenerator, "cursor"> | null>(
    null,
  );
  const title = selectedTitle(project)?.text.trim() ?? "";
  const references = project.summary.references
    .filter((reference) => reference.title.trim() || reference.transcript.trim())
    .map((reference) => ({
      title: reference.title.trim(),
      transcript: reference.transcript.trim(),
    }));
  const scriptRequest = {
    topic: project.summary.topic.trim(),
    title,
    length: formatDurationLabel(project.summary.durationSeconds, project.summary.format),
    orientation: `${FORMAT_LABELS[project.summary.format]} (${project.summary.aspectRatio})`,
    videoType: INTENT_LABELS[project.summary.intent],
    durationSeconds: project.summary.durationSeconds,
    references,
  };
  const cursorGeneration = useCursorScriptGeneration({
    request: scriptRequest,
    onScript: (script, promptUsed) => {
      dispatch({
        type: "SET_SCRIPT",
        script,
        cursorPrompt: promptUsed,
        generated: true,
      });
    },
  });
  function generate() {
    if (generator === "cursor") {
      void cursorGeneration.generate();
      return;
    }
    setMissingProvider(generator);
  }

  function onUpload(file: File) {
    setUploadError(null);
    if (!isAllowedScriptFile(file)) {
      setUploadError("Use a .txt or .md file.");
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
        project.fullScript.trim() &&
        !window.confirm("Replace the current script with this file?")
      ) {
        return;
      }
      dispatch({ type: "SET_SCRIPT", script: text, cursorPrompt: null });
      setUploadError(null);
    };
    reader.onerror = () => {
      setUploadError("Could not read that file.");
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-4">
      <IntroductionGlimpse summary={project.summary} />
      <SavedTitleGlimpse commit={savedTitle} />
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-display text-lg font-semibold text-foreground">Video script</h3>
        <p className="mt-1 text-sm text-muted">
          Generate a spoken script with Cursor from the video introduction and the selected title.
          You can edit the draft before you approve it.
        </p>
        <div className="mt-4">
          <GenerateBar
            providers={SCRIPT_GENERATORS}
            provider={generator}
            providerLabels={SCRIPT_GENERATOR_LABELS}
            showProviderIcons
            onProviderChange={setGenerator}
            onGenerate={generate}
            generating={cursorGeneration.generating}
            hasOutput={project.fullScript.length > 0}
            generateLabel="Generate script"
            regenerateLabel="Regenerate script"
            extra={
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept={SCRIPT_FILE_ACCEPT}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onUpload(file);
                    event.target.value = "";
                  }}
                />
                <ActionButton variant="secondary" onClick={() => fileRef.current?.click()}>
                  Upload script
                </ActionButton>
                <LowEffortCheck scope="script" variant="button" />
                <CursorPromptEditor
                  kind="scriptGeneration"
                  enabled={cursorGeneration.enabled}
                  standalone
                  label="Edit Cursor prompt"
                  variables={[
                    { token: SCRIPT_PROMPT_TOPIC, value: scriptRequest.topic },
                    { token: SCRIPT_PROMPT_TITLE, value: scriptRequest.title },
                    { token: SCRIPT_PROMPT_LENGTH, value: scriptRequest.length },
                    { token: SCRIPT_PROMPT_ORIENTATION, value: scriptRequest.orientation },
                    { token: SCRIPT_PROMPT_VIDEO_TYPE, value: scriptRequest.videoType },
                    { token: SCRIPT_PROMPT_REFERENCES, value: formatReferenceTranscripts(references) },
                  ]}
                />
              </>
            }
          />
          {uploadError ? (
            <p className="mt-3 rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">{uploadError}</p>
          ) : null}
          {cursorGeneration.error ? (
            <p className="mt-3 rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">
              {cursorGeneration.error}
            </p>
          ) : null}
          <StepFixModal
            open={cursorGeneration.fixNotice !== null}
            step={cursorGeneration.fixNotice?.step ?? "summary"}
            title={cursorGeneration.fixNotice?.title ?? "Details needed"}
            message={cursorGeneration.fixNotice?.message ?? ""}
            onClose={() => cursorGeneration.setFixNotice(null)}
          />
          <StepFixModal
            open={missingProvider !== null}
            step="script"
            title={`${
              missingProvider === "gemini"
                ? "Gemini"
                : missingProvider === "vidiq"
                  ? "vidIQ"
                  : "ChatGPT"
            } isn't integrated yet`}
            message="Select Cursor to generate the script."
            onClose={() => setMissingProvider(null)}
          />
        </div>
      </div>

      <LowEffortCheck scope="script" variant="report" />

      {cursorGeneration.generating ? (
        <Skeleton className="h-80" />
      ) : (
        <FieldFlash field="script" className="rounded-2xl border border-border bg-surface p-5">
          {project.cursorScriptPrompt ? (
            <div className="mb-3 flex justify-end">
              <ActionButton size="sm" variant="secondary" onClick={() => setPromptOpen(true)}>
                Prompt used
              </ActionButton>
            </div>
          ) : null}
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Draft</p>
          <Textarea
            className="mt-3 min-h-[28rem] font-mono text-xs"
            value={project.fullScript}
            placeholder="The generated script appears here. You can also paste or type your own."
            onChange={(event) => dispatch({ type: "SET_SCRIPT", script: event.target.value })}
          />
          <p className="mt-2 text-xs text-muted">
            Each scene starts with a heading such as HOOK or POINT 1, then a duration line, then the
            spoken lines. A blank line separates scenes so the timeline can split them and keep each
            clip's length.
          </p>
        </FieldFlash>
      )}
      <Modal
        open={promptOpen}
        size="lg"
        title="Prompt used"
        subtitle="The exact Cursor prompt that generated this script, with this video's values filled in. Edits in the draft are not written back into the prompt."
        onClose={() => setPromptOpen(false)}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {project.cursorScriptPrompt}
        </p>
      </Modal>
    </div>
  );
}
