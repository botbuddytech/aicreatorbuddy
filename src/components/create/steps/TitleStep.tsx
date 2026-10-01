"use client";

import { useState } from "react";
import { FieldFlash } from "@/components/agent/FieldFlash";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { GenerateBar } from "@/components/create/GenerateBar";
import { OptionCard } from "@/components/create/OptionCard";
import { CursorTitleActions } from "@/features/cursor-title-generator/CursorTitleActions";
import { TitleScoreActions } from "@/features/cursor-title-generator/TitleScoreActions";
import { VidiqTitleActions } from "@/features/vidiq/VidiqTitleActions";
import { usePipelineGeneration } from "@/components/create/useGeneration";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { summaryPrompt } from "@/lib/mockAi";
import {
  FORMAT_LABELS,
  INTENT_LABELS,
  PROVIDER_LABELS,
  formatDurationLabel,
  providersForStep,
  type ReferenceVideo,
  type VideoSummary,
} from "@/lib/videoProject";

function IntroductionGlimpse({ summary }: { summary: VideoSummary }) {
  const topic = summary.topic.trim();
  const references = summary.references.filter(
    (reference) => reference.url.trim() || reference.title.trim(),
  );

  return (
    <section className="rounded-2xl border border-border bg-surface px-4 py-3.5 sm:px-5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
        From video introduction
      </p>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Video type</dt>
          <dd className="mt-0.5 text-sm font-semibold text-foreground">
            {FORMAT_LABELS[summary.format]}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Intent</dt>
          <dd className="mt-0.5 text-sm font-semibold text-foreground">
            {INTENT_LABELS[summary.intent]}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Topic / idea</dt>
          <dd
            className={`mt-0.5 text-sm ${topic ? "font-medium text-foreground" : "text-muted"}`}
          >
            {topic || "Not entered yet"}
          </dd>
        </div>
      </dl>
      <div className="mt-3 border-t border-border pt-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Reference videos</p>
        {references.length === 0 ? (
          <p className="mt-1.5 text-sm text-muted">None added</p>
        ) : (
          <ul className="mt-2 space-y-2.5">
            {references.map((reference) => (
              <ReferenceGlimpse key={reference.id} reference={reference} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ReferenceGlimpse({ reference }: { reference: ReferenceVideo }) {
  const title = reference.title.trim();
  const hasTranscript = reference.transcript.trim().length > 0;

  return (
    <li>
      <p className={`text-sm font-semibold ${title ? "text-foreground" : "text-muted"}`}>
        {title || "Title not saved yet"}
      </p>
      <p
        className={`mt-0.5 inline-flex items-center gap-1 text-xs font-medium ${
          hasTranscript ? "text-success" : "text-muted"
        }`}
      >
        {hasTranscript ? <TickMark /> : <CrossMark />}
        {hasTranscript ? "Transcript" : "No transcript"}
      </p>
    </li>
  );
}

function TickMark() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M5 8.2 7 10.2 11 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossMark() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M6 6l4 4M10 6l-4 4" strokeLinecap="round" />
    </svg>
  );
}

function scoreGrade(score: number): "A" | "B" | "C" | "D" {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  return "D";
}

export function TitleStep() {
  const [scoreConfirmOpen, setScoreConfirmOpen] = useState(false);
  const { project, dispatch } = useVideoProject();
  const { busy, error, run, generate, recordCost } = usePipelineGeneration();
  const provider = project.providerByStep.title ?? "chatgpt";
  const prompt = summaryPrompt(project.summary);
  const cursorContext = {
    topic: project.summary.topic,
    format: `${FORMAT_LABELS[project.summary.format]} (${project.summary.aspectRatio})`,
    intent: INTENT_LABELS[project.summary.intent],
    duration: formatDurationLabel(
      project.summary.durationSeconds,
      project.summary.format,
    ),
  };

  async function generateAll() {
    const titles = await generate("all", "titles", { prompt, count: 5 }, provider, "title");
    if (titles) dispatch({ type: "SET_TITLES", titles });
  }

  async function generateOne(id: string) {
    const titles = await generate(id, "titles", { prompt, count: 1 }, provider, "title");
    const next = titles?.[0];
    if (next) dispatch({ type: "REPLACE_TITLE", id, title: { ...next, id } });
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
      <IntroductionGlimpse summary={project.summary} />
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-display text-lg font-semibold text-foreground">Title generation</h3>
        <p className="mt-1 text-sm text-muted">
          Generate multiple candidates, regenerate one, or hand-edit. Score and rank them before you lock one.
        </p>
        <div className="mt-4">
          <GenerateBar
            providers={providersForStep("title")}
            provider={provider}
            onProviderChange={(next) =>
              dispatch({ type: "SET_PROVIDER", step: "title", provider: next })
            }
            onGenerate={generateAll}
            generating={busy === "all"}
            hasOutput={project.titles.length > 0}
            generateLabel="Generate titles"
            regenerateLabel="Regenerate all"
            error={error}
            extra={
              <>
                <TitleScoreActions
                  titles={project.titles.map(({ id, text }) => ({ id, text }))}
                  context={cursorContext}
                  scoringVidiq={busy === "vidiq"}
                  onScoreVidiq={async () => setScoreConfirmOpen(true)}
                  onCursorScores={(scores) =>
                    dispatch({
                      type: "SET_TITLE_SCORES",
                      scores: Object.fromEntries(
                        scores.map(({ id, score, rank }) => [
                          id,
                          { provider: "cursor", score, rank },
                        ]),
                      ),
                    })
                  }
                />
                <CursorTitleActions
                  context={cursorContext}
                  onTitles={(titles) =>
                    dispatch({
                      type: "SET_TITLES",
                      titles: titles.map((text) => ({
                        id: crypto.randomUUID(),
                        text,
                        provider: "cursor",
                      })),
                    })
                  }
                />
                <VidiqTitleActions
                  context={cursorContext}
                  format={project.summary.format}
                  sessionId={project.id}
                  onTitles={(titles) =>
                    dispatch({
                      type: "SET_TITLES",
                      titles: titles.map((text) => ({
                        id: crypto.randomUUID(),
                        text,
                        provider: "vidiq",
                      })),
                    })
                  }
                />
              </>
            }
          />
        </div>
      </div>

      <FieldFlash field="title" className="rounded-2xl">
      {busy === "all" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36" />
          ))}
        </div>
      ) : project.titles.length === 0 ? (
        <EmptyState
          title="No titles yet"
          description="Fill in the video introduction, pick a provider, then generate a set of titles."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {project.titles.map((title) => (
            <OptionCard
              key={title.id}
              selected={project.selectedTitleId === title.id}
              onSelect={() => dispatch({ type: "SELECT_TITLE", id: title.id })}
              onRegenerate={() => generateOne(title.id)}
              regenerating={busy === title.id}
              onEdit={(text) => dispatch({ type: "EDIT_TITLE", id: title.id, text })}
              editSeed={title.text}
              badge={
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={title.provider === "gemini" ? "blue" : "accent"}>
                    {title.provider === "cursor"
                      ? "Cursor"
                      : title.provider === "vidiq"
                        ? "vidIQ"
                        : PROVIDER_LABELS[title.provider]}
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
