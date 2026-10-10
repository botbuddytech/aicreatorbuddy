"use client";

import { useState } from "react";
import { FieldFlash } from "@/components/agent/FieldFlash";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { GenerateBar } from "@/components/create/GenerateBar";
import { OptionCard } from "@/components/create/OptionCard";
import { ManualTitleModal } from "@/components/create/ManualTitleModal";
import { StepFixModal } from "@/components/create/StepFixModal";
import { CursorPromptEditor } from "@/features/cursor-title-generator/CursorPromptEditor";
import { useCursorTitleGeneration } from "@/features/cursor-title-generator/CursorTitleActions";
import { TitleScoreActions } from "@/features/cursor-title-generator/TitleScoreActions";
import { useVidiqTitleGeneration } from "@/features/vidiq/VidiqTitleActions";
import { usePipelineGeneration } from "@/components/create/useGeneration";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { useFilteredGenerators } from "@/components/create/useFilteredGenerators";
import {
  FORMAT_LABELS,
  INTENT_LABELS,
  PROVIDER_LABELS,
  formatDurationLabel,
  newId,
  type TitleOption,
} from "@/lib/videoProject";

function scoreGrade(score: number): "A" | "B" | "C" | "D" {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  return "D";
}

const TITLE_GENERATORS = ["chatgpt", "gemini", "cursor", "vidiq"] as const;
type TitleGenerator = (typeof TITLE_GENERATORS)[number];
const TITLE_GENERATOR_LABELS: Record<TitleGenerator, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  cursor: "Cursor",
  vidiq: "vidIQ",
};

function titleSourceLabel(provider: TitleOption["provider"]): string {
  if (provider === "cursor") return "Cursor";
  if (provider === "vidiq") return "vidIQ";
  if (provider === "manual") return "Manual";
  return PROVIDER_LABELS[provider];
}

export function TitleStep() {
  const [scoreConfirmOpen, setScoreConfirmOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [generator, setGenerator] = useState<TitleGenerator>("cursor");
  const [missingProvider, setMissingProvider] = useState<"chatgpt" | "gemini" | null>(null);
  const titleGenerators = useFilteredGenerators(TITLE_GENERATORS, generator, setGenerator);
  const { project, dispatch } = useVideoProject();
  const { busy, error, run, recordCost } = usePipelineGeneration();
  const provider = project.providerByStep.title ?? "chatgpt";
  const referenceVideos = project.summary.references
    .map((reference) => ({
      title: reference.title.trim(),
      transcript: reference.transcript.trim(),
    }))
    .filter((reference) => reference.title || reference.transcript);
  const referenceTitles = referenceVideos.map((reference) => reference.title);
  const referenceTranscripts = referenceVideos.map((reference) => reference.transcript);
  const cursorContext = {
    topic: project.summary.topic,
    format: `${FORMAT_LABELS[project.summary.format]} (${project.summary.aspectRatio})`,
    intent: INTENT_LABELS[project.summary.intent],
    duration: formatDurationLabel(
      project.summary.durationSeconds,
      project.summary.format,
    ),
  };
  const cursorGeneration = useCursorTitleGeneration({
    context: cursorContext,
    referenceTitles,
    referenceTranscripts,
    onTitles: (titles, promptUsed) => {
      recordTitleFire("cursor", "titles");
      dispatch({
        type: "SET_TITLES",
        cursorPrompt: promptUsed,
        titles: titles.map((text) => ({
          id: crypto.randomUUID(),
          text,
          provider: "cursor",
        })),
      });
    },
  });
  const vidiqGeneration = useVidiqTitleGeneration({
    context: cursorContext,
    format: project.summary.format,
    sessionId: project.id,
    onTitles: (titles) => {
      recordTitleFire("vidiq", "titles");
      dispatch({
        type: "SET_TITLES",
        cursorPrompt: null,
        titles: titles.map((text) => ({
          id: crypto.randomUUID(),
          text,
          provider: "vidiq",
        })),
      });
    },
  });

  function recordTitleFire(providerName: string, kind: string) {
    dispatch({
      type: "RECORD_API_COST",
      entry: {
        id: newId(),
        at: new Date().toISOString(),
        step: "title",
        provider: providerName,
        kind,
        usd: 0,
      },
    });
  }

  function generateTitles() {
    if (generator === "cursor") {
      void cursorGeneration.generate();
      return;
    }
    if (generator === "vidiq") {
      vidiqGeneration.requestGeneration();
      return;
    }
    setMissingProvider(generator);
  }

  function addManualTitles(titles: string[]) {
    dispatch({
      type: "ADD_TITLES",
      titles: titles.map((text) => ({
        id: newId(),
        text,
        provider: "manual" as const,
      })),
    });
  }

  async function scoreAll() {
    if (project.titles.length === 0) return;
    setScoreConfirmOpen(false);
    const titlesInput = project.titles.map(({ id, text }) => ({ id, text }));
    const payload = await run("vidiq", async () => {
      const response = await fetch("/api/vidiq/titles/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          titles: titlesInput,
          format: project.summary.format,
          sessionId: project.id,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { scores?: Array<{ id: string; score: number; rank: number }>; error?: string }
        | null;
      if (!response.ok || !body?.scores) {
        throw new Error(body?.error || "vidIQ could not score the titles.");
      }
      return body;
    });
    const scores = payload?.scores;
    if (!scores) return;
    recordCost(
      "vidiqTitles",
      { titles: titlesInput, topic: project.summary.topic },
      provider,
      "title",
    );
    dispatch({
      type: "SET_TITLE_SCORES",
      scores: Object.fromEntries(
        scores.map((item) => [
          item.id,
          { provider: "vidiq", score: item.score, rank: item.rank },
        ]),
      ),
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-display text-lg font-semibold text-foreground">Title generation</h3>
        <p className="mt-1 text-sm text-muted">
          Add titles yourself, or generate them with Cursor or vidIQ. Score and rank them before you lock one.
        </p>
        <div className="mt-4">
          <GenerateBar
            providers={titleGenerators}
            provider={generator}
            providerLabels={TITLE_GENERATOR_LABELS}
            showProviderIcons
            onProviderChange={setGenerator}
            onGenerate={generateTitles}
            generating={cursorGeneration.generating || vidiqGeneration.generating}
            hasOutput={project.titles.length > 0}
            generateLabel="Generate titles"
            regenerateLabel="Generate titles"
            error={error}
            extra={
              <>
                <TitleScoreActions
                  titles={project.titles.map(({ id, text }) => ({ id, text }))}
                  context={cursorContext}
                  scoringVidiq={busy === "vidiq"}
                  onScoreVidiq={async () => setScoreConfirmOpen(true)}
                  onCursorScores={(scores) => {
                    recordTitleFire("cursor", "titleScore");
                    dispatch({
                      type: "SET_TITLE_SCORES",
                      scores: Object.fromEntries(
                        scores.map(({ id, score, rank }) => [
                          id,
                          { provider: "cursor", score, rank },
                        ]),
                      ),
                    });
                  }}
                />
                <CursorPromptEditor
                  kind="titleGeneration"
                  enabled={cursorGeneration.enabled}
                  standalone
                  label="Edit Cursor prompt"
                  variablePreview={{
                    topic: project.summary.topic,
                    referenceTitles,
                    referenceTranscripts,
                  }}
                />
                <ActionButton variant="secondary" onClick={() => setManualOpen(true)}>
                  Add manually
                </ActionButton>
              </>
            }
          />
          {cursorGeneration.error ? (
            <p className="mt-3 rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">
              {cursorGeneration.error}
            </p>
          ) : null}
          {vidiqGeneration.error ? (
            <p className="mt-3 rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">
              {vidiqGeneration.error}{" "}
              {/connect|enable|reconnect/i.test(vidiqGeneration.error) ? (
                <a href="/dashboard/integrations" className="font-semibold underline">
                  Open integrations
                </a>
              ) : null}
            </p>
          ) : null}
          <ConfirmModal
            open={vidiqGeneration.confirmOpen}
            title="Generate titles with vidIQ?"
            description="vidIQ will generate five title suggestions using your connected account. This action uses 5 vidIQ credits."
            confirmLabel="Generate titles"
            onClose={() => vidiqGeneration.setConfirmOpen(false)}
            onConfirm={() => void vidiqGeneration.generate()}
          />
          <StepFixModal
            open={cursorGeneration.fixOpen}
            step="summary"
            title="No topic or idea selected"
            message="Add a topic or idea there, then generate titles."
            onClose={() => cursorGeneration.setFixOpen(false)}
          />
          <StepFixModal
            open={vidiqGeneration.fixOpen}
            step="summary"
            title="No topic or idea selected"
            message="Add a topic or idea there, then generate titles."
            onClose={() => vidiqGeneration.setFixOpen(false)}
          />
          <StepFixModal
            open={missingProvider !== null}
            step="title"
            title={`${missingProvider === "gemini" ? "Gemini" : "ChatGPT"} isn't integrated yet`}
            message="Choose Cursor or vidIQ to generate titles."
            onClose={() => setMissingProvider(null)}
          />
        </div>
      </div>

      <FieldFlash field="title" className="rounded-2xl">
      {project.cursorTitlePrompt ? (
        <div className="mb-3 flex justify-end">
          <ActionButton size="sm" variant="secondary" onClick={() => setPromptOpen(true)}>
            Prompt used
          </ActionButton>
        </div>
      ) : null}
      {project.titles.length === 0 ? (
        <EmptyState
          title="No titles yet"
          description="Add a title yourself, or generate a set with Cursor or vidIQ."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {project.titles.map((title) => (
            <OptionCard
              key={title.id}
              selected={project.selectedTitleId === title.id}
              onSelect={() => dispatch({ type: "SELECT_TITLE", id: title.id })}
              onEdit={(text) => dispatch({ type: "EDIT_TITLE", id: title.id, text })}
              extraActions={
                <ActionButton
                  size="sm"
                  variant="secondary"
                  onClick={() => dispatch({ type: "REMOVE_TITLE", id: title.id })}
                >
                  Remove
                </ActionButton>
              }
              editSeed={title.text}
              badge={
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={title.provider === "manual" ? "muted" : title.provider === "gemini" ? "blue" : "accent"}>
                    {titleSourceLabel(title.provider)}
                  </Badge>
                  {title.score ? (
                    <Badge tone={title.score.provider === "cursor" ? "accent" : "blue"}>
                      Scored by {title.score.provider === "cursor" ? "Cursor" : "VidIQ"}
                    </Badge>
                  ) : null}
                </div>
              }
              footer={
                title.score ? (
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
                    <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                        Rank
                      </p>
                      <p className="mt-1 font-display text-xl font-bold text-foreground">
                        #{title.score.rank}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                        Score
                      </p>
                      <p className="mt-1 font-display text-xl font-bold text-foreground">
                        {title.score.score}
                        <span className="ml-0.5 text-xs font-medium text-muted">/100</span>
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                        Grade
                      </p>
                      <p className="mt-1 font-display text-xl font-bold text-foreground">
                        {scoreGrade(title.score.score)}
                      </p>
                    </div>
                  </div>
                ) : null
              }
            >
              <p className="text-sm font-semibold leading-snug text-foreground">{title.text}</p>
            </OptionCard>
          ))}
        </div>
      )}
      </FieldFlash>
      <Modal
        open={promptOpen}
        size="lg"
        title="Prompt used"
        subtitle="The exact Cursor prompt that generated the current titles."
        onClose={() => setPromptOpen(false)}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {project.cursorTitlePrompt}
        </p>
        {project.titles.length > 0 ? (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Titles generated
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-foreground">
              {project.titles.map((title) => (
                <li key={title.id}>{title.text}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </Modal>
      <ManualTitleModal
        open={manualOpen}
        existingCount={project.titles.length}
        onClose={() => setManualOpen(false)}
        onAdd={addManualTitles}
      />
      <ConfirmModal
        open={scoreConfirmOpen}
        title="Score titles with vidIQ?"
        description={`vidIQ will score ${project.titles.length} title${project.titles.length === 1 ? "" : "s"} for click-through potential. This action uses ${project.titles.length * 5} vidIQ credits.`}
        confirmLabel="Score titles"
        onClose={() => setScoreConfirmOpen(false)}
        onConfirm={() => void scoreAll()}
      />
    </div>
  );
}
