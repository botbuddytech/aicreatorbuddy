"use client";

import { useEffect, useRef, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { StepApprove } from "@/components/create/StepApprove";
import { VideoPreviewModal } from "@/components/create/VideoPreviewModal";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import type { StepId, StepMeta } from "@/lib/videoProject";

export function StepDock({
  step,
  prev,
  next,
  onBack,
  onNext,
}: {
  step: StepId;
  prev: StepMeta | null;
  next: StepMeta | null;
  onBack: () => void;
  onNext: () => void;
}) {
  const { project, dispatch, previewOpen, setPreviewOpen } = useVideoProject();
  const rendered = Boolean(project.renderedAt);
  const canPreview =
    rendered || project.scenes.length > 0 || Boolean(project.selectedThumbnailId);
  const [pop, setPop] = useState(false);
  const prevRenderedAt = useRef(project.renderedAt);

  useEffect(() => {
    if (project.renderedAt && project.renderedAt !== prevRenderedAt.current) {
      setPop(true);
      const timer = window.setTimeout(() => setPop(false), 500);
      prevRenderedAt.current = project.renderedAt;
      return () => window.clearTimeout(timer);
    }
    prevRenderedAt.current = project.renderedAt;
  }, [project.renderedAt]);

  const previewButton = (
    <button
      type="button"
      aria-label={rendered ? "Preview rendered video" : "Preview video"}
      title={
        rendered
          ? "Preview the rendered video"
          : canPreview
            ? "Preview the current video"
            : "Generate a script and timeline (or pick a thumbnail) to preview"
      }
      disabled={!canPreview}
      onClick={() => setPreviewOpen(true)}
      className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        pop ? "preview-pop" : ""
      } ${
        rendered
          ? "border-success/50 bg-success text-white shadow-[0_0_18px_rgba(34,197,94,0.45)] hover:bg-success/90"
          : "border-accent bg-accent/20 text-accent hover:bg-accent/30"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M8 5.14v13.72L19.26 12 8 5.14z" />
      </svg>
    </button>
  );

  const approveControl =
    step === "editor" ? (
      <ActionButton
        variant={project.editor.confirmedAt ? "secondary" : "primary"}
        onClick={() => dispatch({ type: "CONFIRM_EDIT" })}
        className="w-full sm:w-auto"
      >
        {project.editor.confirmedAt ? "Confirmed" : "Confirm edit"}
      </ActionButton>
    ) : (
      <StepApprove step={step} className="w-full sm:w-auto" />
    );

  return (
    <>
      <div className="pointer-events-none fixed right-0 bottom-0 left-[var(--sidebar-width,0px)] z-20">
        <div className="pointer-events-auto border-t border-border bg-background/90 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex flex-col gap-2 sm:hidden">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <ActionButton variant="secondary" disabled={!prev} onClick={onBack}>
                Back
              </ActionButton>
              <div className="flex justify-center">{previewButton}</div>
              <ActionButton disabled={!next} onClick={onNext}>
                Next
              </ActionButton>
            </div>
            {approveControl}
          </div>
          <div className="hidden grid-cols-[1fr_auto_1fr] items-center gap-2 sm:grid">
            <div className="flex justify-start">
              <ActionButton variant="secondary" disabled={!prev} onClick={onBack}>
                Back
              </ActionButton>
            </div>
            {previewButton}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {approveControl}
              <ActionButton disabled={!next} onClick={onNext}>
                Next
              </ActionButton>
            </div>
          </div>
        </div>
      </div>
      <VideoPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </>
  );
}
