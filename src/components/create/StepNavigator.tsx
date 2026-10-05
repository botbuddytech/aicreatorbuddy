"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { formatUsdEstimate } from "@/lib/apiCost";
import {
  STEPS,
  apiFiresByStep,
  projectLengthStats,
  stepStatusLabel,
  stepStatusTone,
  type StepId,
  type StepStatus,
  type VideoProject,
} from "@/lib/videoProject";

const API_FIRE_STEPS: StepId[] = ["title", "thumbnail", "script"];

function statusWeight(status: StepStatus): number {
  switch (status) {
    case "not-started":
      return 0;
    case "draft":
      return 0.35;
    case "generated":
      return 0.7;
    case "approved":
      return 1;
  }
}

function chevronState(index: number, activeIndex: number): "past" | "current" | "future" {
  if (index < activeIndex) return "past";
  if (index === activeIndex) return "current";
  return "future";
}

export function StepNavigator({
  active,
  onSelect,
  project,
  notice,
}: {
  active: StepId;
  onSelect: (id: StepId) => void;
  project: VideoProject;
  notice?: string | null;
}) {
  const stepStatus = project.stepStatus;
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const activeIndex = STEPS.findIndex((step) => step.id === active);
  const current = STEPS[activeIndex] ?? STEPS[0];
  const approved = STEPS.filter((step) => stepStatus[step.id] === "approved").length;
  const started = STEPS.filter((step) => stepStatus[step.id] !== "not-started").length;
  const pct = Math.round(
    (STEPS.reduce((sum, step) => sum + statusWeight(stepStatus[step.id]), 0) / STEPS.length) * 100,
  );
  const length = projectLengthStats(project);
  const firesByStep = apiFiresByStep(project, API_FIRE_STEPS);
  const apiFires = firesByStep.reduce((sum, step) => sum + step.calls, 0);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = STEPS.findIndex((step) => step.id === active);
    if (index < 0) return;

    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (index + 1) % STEPS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (index - 1 + STEPS.length) % STEPS.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = STEPS.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextStep = STEPS[next];
    if (!nextStep) return;
    onSelect(nextStep.id);
    refs.current[next]?.focus();
  }

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const update = () => {
      const max = scroller.scrollWidth - scroller.clientWidth;
      const nextLeft = scroller.scrollLeft > 2;
      const nextRight = max - scroller.scrollLeft > 2;
      setCanScrollLeft((current) => (current === nextLeft ? current : nextLeft));
      setCanScrollRight((current) => (current === nextRight ? current : nextRight));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    scroller.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      scroller.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    const node = refs.current[activeIndex < 0 ? 0 : activeIndex];
    node?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [active, activeIndex]);

  function scrollSteps(direction: -1 | 1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const distance = Math.max(180, scroller.clientWidth * 0.7);
    scroller.scrollBy({ left: direction * distance, behavior: "smooth" });
  }

  return (
    <div className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-accent">
            Step {String((activeIndex < 0 ? 0 : activeIndex) + 1).padStart(2, "0")} of{" "}
            {String(STEPS.length).padStart(2, "0")}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <h3 className="shrink-0 font-display text-lg font-semibold text-foreground">
              Pipeline progress
            </h3>
            {notice ? (
              <p
                role="status"
                className="truncate rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent"
              >
                {notice}
              </p>
            ) : null}
          </div>
        </div>
        <p className="text-sm tabular-nums text-muted">
          {pct}% · {started} started · {approved} approved
        </p>
      </div>

      <div className="relative mt-3 min-w-0">
        <div
          role="tablist"
          aria-label="Create video steps"
          className="pipeline-step-scroller min-w-0 overflow-x-auto overscroll-x-contain"
          onKeyDown={onKeyDown}
          ref={scrollerRef}
        >
        <div className="pipeline-chevrons w-max min-w-full">
          {STEPS.map((step, index) => {
            const selected = step.id === active;
            const status = stepStatus[step.id];
            const state = chevronState(index, activeIndex < 0 ? 0 : activeIndex);
            return (
              <button
                key={step.id}
                ref={(el) => {
                  refs.current[index] = el;
                }}
                type="button"
                role="tab"
                id={`create-tab-${step.id}`}
                aria-selected={selected}
                aria-controls={`create-panel-${step.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => onSelect(step.id)}
                className={`pipeline-chevron pipeline-chevron--${state}`}
                style={{ zIndex: STEPS.length - index }}
              >
                <span className="pipeline-chevron__shape">
                  <span className="flex items-start justify-between gap-2">
                    <span className="pipeline-chevron__index">
                      Step {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="hidden sm:inline-flex">
                      <Badge tone={stepStatusTone(status)} size="sm">
                        {stepStatusLabel(status)}
                      </Badge>
                    </span>
                  </span>
                  <span className="pipeline-chevron__title">{step.label}</span>
                </span>
              </button>
            );
          })}
        </div>
        </div>
        {canScrollLeft ? (
          <button
            type="button"
            aria-label="Show earlier steps"
            onClick={() => scrollSteps(-1)}
            className="absolute top-[calc(50%-6px)] left-2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-white text-[#0b0d12] shadow-[0_10px_28px_-8px_rgba(0,0,0,0.75)] ring-2 ring-accent transition-transform hover:scale-105 hover:bg-accent hover:text-white"
          >
            <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
              <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}
        {canScrollRight ? (
          <button
            type="button"
            aria-label="Show later steps"
            onClick={() => scrollSteps(1)}
            className="absolute top-[calc(50%-6px)] right-2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-white text-[#0b0d12] shadow-[0_10px_28px_-8px_rgba(0,0,0,0.75)] ring-2 ring-accent transition-transform hover:scale-105 hover:bg-accent hover:text-white"
          >
            <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
              <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-1 items-stretch gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface-soft px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Video length</p>
          <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-foreground">
            {length.currentLabel}
          </p>
          <p className="text-[11px] text-muted">
            {length.hasTimeline ? `${length.targetLabel} target` : "Target runtime"}
          </p>
        </div>
        <div
          className="flex h-full flex-col rounded-xl border border-border bg-surface-soft px-3 py-2.5"
          title="Each successful generate or score on Title and Thumbnail, and each script generation, adds one fire. Cost stays at zero for now."
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                API cost (est.)
              </p>
              <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-foreground">
                {formatUsdEstimate(0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">API fires</p>
              <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-foreground">
                {apiFires}
              </p>
            </div>
          </div>
          <ul className="mt-2 space-y-1 border-t border-border pt-2">
            {firesByStep.map((step) => (
              <li key={step.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted">{step.label}</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {step.calls} {step.calls === 1 ? "fire" : "fires"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {current ? (
        <p className="mt-3 text-sm text-muted">{current.blurb}</p>
      ) : null}
    </div>
  );
}
