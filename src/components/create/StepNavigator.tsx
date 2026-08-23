"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { formatUsdEstimate } from "@/lib/apiCost";
import {
  STEPS,
  apiCostByTool,
  projectLengthStats,
  stepStatusLabel,
  stepStatusTone,
  totalEstimatedApiCost,
  type StepId,
  type StepStatus,
  type VideoProject,
} from "@/lib/videoProject";

const TOOL_ICONS: Record<string, ReactNode> = {
  chatgpt: (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 0 1-9 9H6l-3 3V12a9 9 0 0 1 18 0z" />
    </svg>
  ),
  gemini: (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
      <path d="M12 2c.6 4.6 3.4 7.4 8 8-4.6.6-7.4 3.4-8 8-.6-4.6-3.4-7.4-8-8 4.6-.6 7.4-3.4 8-8z" />
    </svg>
  ),
  elevenlabs: (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10v4M8 6v12M12 3v18M16 6v12M20 10v4" />
    </svg>
  ),
  vidiq: (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 17l5-6 4 3 4-6 5 5" />
    </svg>
  ),
};

const TOOL_ICON_COLORS: Record<string, string> = {
  chatgpt: "text-success",
  gemini: "text-chart-blue",
  elevenlabs: "text-chart-purple",
  vidiq: "text-chart-amber",
};

function ToolIcon({ tool }: { tool: string }) {
  const glyph = TOOL_ICONS[tool];
  if (!glyph) {
    return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted" aria-hidden />;
  }
  return (
    <span className={`shrink-0 ${TOOL_ICON_COLORS[tool] ?? "text-muted"}`} aria-hidden>
      {glyph}
    </span>
  );
}

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
}: {
  active: StepId;
  onSelect: (id: StepId) => void;
  project: VideoProject;
}) {
  const stepStatus = project.stepStatus;
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = STEPS.findIndex((step) => step.id === active);
  const current = STEPS[activeIndex] ?? STEPS[0];
  const approved = STEPS.filter((step) => stepStatus[step.id] === "approved").length;
  const started = STEPS.filter((step) => stepStatus[step.id] !== "not-started").length;
  const pct = Math.round(
    (STEPS.reduce((sum, step) => sum + statusWeight(stepStatus[step.id]), 0) / STEPS.length) * 100,
  );
  const length = projectLengthStats(project);
  const apiCost = totalEstimatedApiCost(project);
  const apiCalls = project.apiCosts?.length ?? 0;
  const costByTool = apiCostByTool(project);

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

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-accent">
            Step {String((activeIndex < 0 ? 0 : activeIndex) + 1).padStart(2, "0")} of{" "}
            {String(STEPS.length).padStart(2, "0")}
          </p>
          <h3 className="mt-0.5 font-display text-lg font-semibold text-foreground">
            Pipeline progress
          </h3>
        </div>
        <p className="text-sm tabular-nums text-muted">
          {pct}% · {started} started · {approved} approved
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Create video steps"
        className="no-scrollbar mt-3 overflow-x-auto"
        onKeyDown={onKeyDown}
      >
        <div className="pipeline-chevrons min-w-[64rem]">
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
                    <Badge tone={stepStatusTone(status)} size="sm">
                      {stepStatusLabel(status)}
                    </Badge>
                  </span>
                  <span className="pipeline-chevron__title">{step.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 items-start gap-2">
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
          className="rounded-xl border border-border bg-surface-soft px-3 py-2.5"
          title="Estimated from current provider rates. Each generate or regenerate adds to the total."
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            API cost (est.)
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold tabular-nums text-foreground">
                {formatUsdEstimate(apiCost)}
              </p>
              <p className="text-[11px] text-muted">
                {apiCalls === 0
                  ? "No calls yet"
                  : `${apiCalls} call${apiCalls === 1 ? "" : "s"} so far`}
              </p>
            </div>
            {costByTool.length > 0 ? (
              <ul className="flex flex-wrap items-center gap-1.5">
                {costByTool.map((tool) => (
                  <li
                    key={tool.tool}
                    className="flex items-center gap-1 rounded-lg border border-border bg-surface px-1.5 py-1"
                    title={`${tool.label} · ${tool.calls} call${
                      tool.calls === 1 ? "" : "s"
                    } · ${formatUsdEstimate(tool.usd)}`}
                  >
                    <ToolIcon tool={tool.tool} />
                    <span className="text-[10px] font-semibold text-muted">{tool.label}</span>
                    <span className="text-[10px] font-semibold tabular-nums text-foreground">
                      {formatUsdEstimate(tool.usd)}
                    </span>
                    <span className="text-[10px] tabular-nums text-muted">×{tool.calls}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      {current ? (
        <p className="mt-3 text-sm text-muted">{current.blurb}</p>
      ) : null}
    </div>
  );
}
