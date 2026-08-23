"use client";

import { EmptyState } from "@/components/ui/EmptyState";
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

export function ScriptStep() {
  const { project, dispatch } = useVideoProject();
  const { busy, error, generate: runGenerate } = usePipelineGeneration();
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

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-display text-lg font-semibold text-foreground">Video script</h3>
        <p className="mt-1 text-sm text-muted">
          One full draft first. Score it with VidIQ for hook, retention, keyword fit, and CTA before
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
            error={error}
            extra={
              <>
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
      ) : project.fullScript ? (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Draft</p>
          <Textarea
            className="mt-3 min-h-[28rem] font-mono text-xs"
            value={project.fullScript}
            onChange={(event) => dispatch({ type: "SET_SCRIPT", script: event.target.value })}
          />
        </div>
      ) : (
        <EmptyState
          title="No script yet"
          description="Generate a full draft from the introduction, then jump to Timeline to break it into scenes."
        />
      )}
    </div>
  );
}
