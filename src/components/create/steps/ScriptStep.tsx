"use client";

import { useRef, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { ActionButton } from "@/components/ui/ActionButton";
import { GenerateBar } from "@/components/create/GenerateBar";
import { LowEffortCheck } from "@/components/create/LowEffortCheck";
import { VidIqMark, VidIqScriptStats } from "@/components/create/VidIqPanel";
import { usePipelineGeneration } from "@/components/create/useGeneration";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { scriptScoreHash, summaryPrompt } from "@/lib/mockAi";
import { providersForStep, selectedTitle, summaryLengthMinutes } from "@/lib/videoProject";

const SCRIPT_FILE_ACCEPT = ".txt,.md,text/plain";

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
  const { project, dispatch } = useVideoProject();
  const { busy, error, generate: runGenerate } = usePipelineGeneration();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const provider = project.providerByStep.script ?? "chatgpt";
  const title = selectedTitle(project)?.text;
  const prompt = [summaryPrompt(project.summary), title ? `Selected title: ${title}` : ""]
    .filter(Boolean)
    .join("\n");
  const stale = Boolean(
    project.scriptVidiq && project.scriptVidiq.sourceHash !== scriptScoreHash(project.fullScript),
  );

  async function generate() {
    const script = await runGenerate(
      "script",
      "script",
      {
        prompt,
        durationSeconds: project.summary.durationSeconds,
        intent: project.summary.intent,
      },
      provider,
      "script",
    );
    if (script) dispatch({ type: "SET_SCRIPT", script });
  }

  async function scoreScript() {
    if (!project.fullScript.trim()) return;
    const insight = await runGenerate(
      "vidiq",
      "vidiqScript",
      {
        script: project.fullScript,
        topic: project.summary.topic,
        title,
        lengthMinutes: summaryLengthMinutes(project.summary),
      },
      provider,
      "script",
    );
    if (insight) dispatch({ type: "SET_SCRIPT_INSIGHT", insight });
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
      dispatch({ type: "SET_SCRIPT", script: text });
      setUploadError(null);
    };
    reader.onerror = () => {
      setUploadError("Could not read that file.");
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-display text-lg font-semibold text-foreground">Video script</h3>
        <p className="mt-1 text-sm text-muted">
          Generate a draft, paste your own, or upload a .txt / .md file. Score it with VidIQ before
          you break it into scenes.
        </p>
        <div className="mt-4">
          <GenerateBar
            providers={providersForStep("script")}
            provider={provider}
            onProviderChange={(next) =>
              dispatch({ type: "SET_PROVIDER", step: "script", provider: next })
            }
            onGenerate={generate}
            generating={busy === "script"}
            hasOutput={project.fullScript.length > 0}
            generateLabel="Generate script"
            regenerateLabel="Regenerate script"
            error={error ?? uploadError}
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
                <ActionButton
                  variant="secondary"
                  onClick={scoreScript}
                  disabled={!project.fullScript.trim()}
                  loading={busy === "vidiq"}
                  loadingLabel="Scoring…"
                >
                  <VidIqMark />
                  Score with VidIQ
                </ActionButton>
              </>
            }
          />
        </div>
      </div>

      {project.scriptVidiq ? (
        <VidIqScriptStats insight={project.scriptVidiq} stale={stale} />
      ) : null}
      <LowEffortCheck scope="script" variant="report" />

      {busy === "script" ? (
        <Skeleton className="h-80" />
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Draft</p>
          <Textarea
            className="mt-3 min-h-[28rem] font-mono text-xs"
            value={project.fullScript}
            placeholder="Paste or type your full video script here…"
            onChange={(event) => dispatch({ type: "SET_SCRIPT", script: event.target.value })}
          />
        </div>
      )}
    </div>
  );
}
