"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AgentLayout } from "@/components/agent/AgentLayout";
import { AgentToggle } from "@/components/agent/AgentToggle";
import { registerProjectBridge } from "@/components/agent/bridge";
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
import { PreviousSteps } from "@/components/create/PriorStepGlimpse";
import { ProjectNameHeading } from "@/components/create/ProjectNameHeading";
import { savesOnMarkApprove } from "@/lib/session/laterStepCommit";
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
  const {
    project,
    dispatch,
    savedAt,
    activeStep,
    setActiveStep,
    needsSaveByStep,
    summarySaving,
    summarySaveError,
  } = useVideoProject();
  const step = activeStep;
  const index = STEPS.findIndex((item) => item.id === step);
  const current = STEPS[index] ?? STEPS[0];
  const prev = index > 0 ? STEPS[index - 1] : null;
  const next = index < STEPS.length - 1 ? STEPS[index + 1] : null;
  const dirty = Boolean(savedAt) && project.lastUpdated !== savedAt;
  const projectRef = useRef(project);
  const stepRef = useRef(step);
  const dispatchRef = useRef(dispatch);
  projectRef.current = project;
  stepRef.current = step;
  dispatchRef.current = dispatch;

  useEffect(() => {
    registerProjectBridge({
      dispatch: (action) => dispatchRef.current(action),
      setActiveStep,
      getProject: () => projectRef.current,
      getStep: () => stepRef.current,
    });
    return () => registerProjectBridge(null);
  }, [setActiveStep]);
  const gatedNeedsSave = needsSaveByStep[step];
  const unsavedLabel =
    step === "editor" ? "Not saved until Confirm edit" : "Not saved until Mark approved";
  const saveLabel = summarySaving
    ? "Saving…"
    : gatedNeedsSave
      ? unsavedLabel
      : !savedAt
        ? "Not saved yet"
        : dirty
          ? "Saving…"
          : `Saved ${new Date(savedAt).toLocaleTimeString()}`;

  return (
    <AgentLayout videoId={project.id}>
      <Topbar
        title={<ProjectNameHeading />}
        subtitle={`${current?.label ?? "Workspace"} · ${saveLabel}`}
        actions={<AgentToggle />}
      />
      <div className="min-w-0 space-y-6 px-4 py-5 pb-40 sm:px-6 sm:py-6 sm:pb-28">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard/create"
            className="text-sm font-medium text-muted hover:text-foreground"
          >
            ← All videos
          </Link>
          <p className="text-xs text-muted">{saveLabel}</p>
        </div>

        <div className="min-w-0 space-y-6">
          <StepNavigator
            active={step}
            onSelect={setActiveStep}
            project={project}
            notice={
              savesOnMarkApprove(step) || step === "editor"
                ? summarySaveError ?? unsavedLabel
                : null
            }
          />

          <div
            role="tabpanel"
            id={`create-panel-${step}`}
            aria-labelledby={`create-tab-${step}`}
            className="min-w-0 space-y-6"
          >
            <PreviousSteps step={step} />
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
    </AgentLayout>
  );
}
