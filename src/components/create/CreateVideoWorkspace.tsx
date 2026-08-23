"use client";

import Link from "next/link";
import { Topbar } from "@/components/dashboard/Topbar";
import { StepNavigator } from "@/components/create/StepNavigator";
import { StepDock } from "@/components/create/StepDock";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { SummaryStep } from "@/components/create/steps/SummaryStep";
import { TitleStep } from "@/components/create/steps/TitleStep";
import { ThumbnailStep } from "@/components/create/steps/ThumbnailStep";
import { ScriptStep } from "@/components/create/steps/ScriptStep";
import { TimelineStep } from "@/components/create/steps/TimelineStep";
import { DescriptionStep } from "@/components/create/steps/DescriptionStep";
import { RenderPanel } from "@/components/create/steps/RenderPanel";
import { EditorStep } from "@/components/create/editor/EditorStep";
import { ProjectNameHeading } from "@/components/create/ProjectNameHeading";
import { STEPS, type StepId } from "@/lib/videoProject";

function StepBody({ step }: { step: StepId }) {
  switch (step) {
    case "summary":
      return <SummaryStep />;
    case "title":
      return <TitleStep />;
    case "thumbnail":
      return <ThumbnailStep />;
    case "script":
      return <ScriptStep />;
    case "timeline":
      return <TimelineStep />;
    case "description":
      return <DescriptionStep />;
    case "render":
      return <RenderPanel />;
    case "editor":
      return <EditorStep />;
  }
}

export function CreateVideoWorkspace() {
  const { project, savedAt, activeStep, setActiveStep } = useVideoProject();
  const step = activeStep;
  const index = STEPS.findIndex((item) => item.id === step);
  const current = STEPS[index] ?? STEPS[0];
  const prev = index > 0 ? STEPS[index - 1] : null;
  const next = index < STEPS.length - 1 ? STEPS[index + 1] : null;
  const dirty = Boolean(savedAt) && project.lastUpdated !== savedAt;
  const saveLabel = !savedAt
    ? "Not saved yet"
    : dirty
      ? "Saving…"
      : `Saved ${new Date(savedAt).toLocaleTimeString()}`;

  return (
    <>
      <Topbar
        title={<ProjectNameHeading />}
        subtitle={`${current?.label ?? "Workspace"} · ${saveLabel}`}
      />
      <div className="space-y-6 px-6 py-6 pb-28">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard/create"
            className="text-sm font-medium text-muted hover:text-foreground"
          >
            ← All videos
          </Link>
          <p className="text-xs text-muted">{saveLabel}</p>
        </div>

        <div className="space-y-6">
          <StepNavigator
            active={step}
            onSelect={setActiveStep}
            project={project}
          />

          <div
            role="tabpanel"
            id={`create-panel-${step}`}
            aria-labelledby={`create-tab-${step}`}
            className="min-w-0 space-y-6"
          >
            <StepBody step={step} />
          </div>
        </div>
      </div>
      <StepDock
        step={step}
        prev={prev}
        next={next}
        onBack={() => prev && setActiveStep(prev.id)}
        onNext={() => next && setActiveStep(next.id)}
      />
    </>
  );
}
