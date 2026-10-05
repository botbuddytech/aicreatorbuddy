"use client";

import { useState, type ReactNode } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Modal } from "@/components/ui/Modal";
import { savedTitlesForDisplay, type TitleCommit } from "@/lib/session/summaryCommit";
import {
  FORMAT_LABELS,
  INTENT_LABELS,
  PROVIDER_LABELS,
  type ReferenceVideo,
  type TitleOption,
  type VideoSummary,
} from "@/lib/videoProject";

function PriorStepPanel({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-border bg-surface px-4 py-3.5 sm:px-5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-2 text-left"
      >
        <svg
          viewBox="0 0 16 16"
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-display text-lg font-semibold text-foreground">{title}</span>
      </button>
      {open ? (
        <div id={id} className="mt-3">
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function IntroductionGlimpse({ summary }: { summary: VideoSummary }) {
  const topic = summary.topic.trim();
  const references = summary.references.filter(
    (reference) => reference.url.trim() || reference.title.trim(),
  );

  return (
    <PriorStepPanel id="video-introduction-panel" title="From step 1 (Video introduction)">
      <dl className="grid gap-3 sm:grid-cols-2">
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
    </PriorStepPanel>
  );
}

function scoreGrade(score: number): "A" | "B" | "C" | "D" {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  return "D";
}

function titleSourceLabel(provider: TitleOption["provider"]): string {
  if (provider === "cursor") return "Cursor";
  if (provider === "vidiq") return "vidIQ";
  if (provider === "manual") return "Manual";
  return PROVIDER_LABELS[provider];
}

function SavedTitleFacts({ title }: { title: TitleOption }) {
  const text = title.text.trim();
  const score = title.score;

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Title</dt>
        <dd className="mt-0.5 text-sm font-semibold text-foreground">{text}</dd>
      </div>
      <div>
        <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Score</dt>
        <dd
          className={`mt-0.5 text-sm font-semibold ${score ? "text-foreground" : "font-medium text-muted"}`}
        >
          {score ? (
            <>
              {score.score}
              <span className="ml-0.5 text-xs font-medium text-muted">/100</span>
            </>
          ) : (
            "Not scored"
          )}
        </dd>
      </div>
      <div>
        <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Source</dt>
        <dd className="mt-0.5 text-sm font-semibold text-foreground">
          {titleSourceLabel(title.provider)}
        </dd>
      </div>
      {score ? (
        <>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Rank</dt>
            <dd className="mt-0.5 text-sm font-semibold text-foreground">#{score.rank}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Grade</dt>
            <dd className="mt-0.5 text-sm font-semibold text-foreground">
              {scoreGrade(score.score)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Scored by</dt>
            <dd className="mt-0.5 text-sm font-semibold text-foreground">
              {score.provider === "cursor" ? "Cursor" : "vidIQ"}
            </dd>
          </div>
        </>
      ) : null}
    </dl>
  );
}

export function SavedTitleGlimpse({ commit }: { commit: TitleCommit | null }) {
  const titles = savedTitlesForDisplay(commit);

  return (
    <PriorStepPanel id="saved-title-panel" title="From step 2 (Title)">
      {titles.length === 0 ? (
        <p className="text-sm text-muted">Not saved yet</p>
      ) : (
        <div className="space-y-4">
          {titles.map((title) => (
            <SavedTitleFacts key={title.id} title={title} />
          ))}
        </div>
      )}
    </PriorStepPanel>
  );
}

function ReferenceGlimpse({ reference }: { reference: ReferenceVideo }) {
  const [open, setOpen] = useState(false);
  const title = reference.title.trim();
  const transcript = reference.transcript.trim();
  const hasTranscript = transcript.length > 0;
  const wordCount = hasTranscript ? transcript.split(/\s+/).length : 0;

  return (
    <li>
      <p className={`text-sm font-semibold ${title ? "text-foreground" : "text-muted"}`}>
        {title || "Title not saved yet"}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium ${
            hasTranscript ? "text-success" : "text-muted"
          }`}
        >
          {hasTranscript ? <TickMark /> : <CrossMark />}
          {hasTranscript ? "Transcript" : "No transcript"}
        </span>
        {hasTranscript ? (
          <ActionButton size="sm" variant="secondary" onClick={() => setOpen(true)}>
            View transcript
          </ActionButton>
        ) : null}
      </div>
      <Modal
        open={open}
        size="lg"
        title={title || "Reference transcript"}
        subtitle={`${wordCount.toLocaleString()} words${reference.lang ? ` · ${reference.lang}` : ""}`}
        onClose={() => setOpen(false)}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{transcript}</p>
      </Modal>
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
