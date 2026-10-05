"use client";

import { ActionButton } from "@/components/ui/ActionButton";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { savesOnMarkApprove } from "@/lib/session/laterStepCommit";
import type { StepId } from "@/lib/videoProject";

export function StepApprove({ step, className = "" }: { step: StepId; className?: string }) {
  const { project, dispatch, needsSaveByStep, summarySaving } = useVideoProject();
  const approved = project.stepStatus[step] === "approved";
  const gated = savesOnMarkApprove(step);
  const saveStep = gated && (needsSaveByStep[step] || !approved);
  const showApproved = gated ? !saveStep : approved;

  return (
    <ActionButton
      variant={showApproved ? "secondary" : "primary"}
      loading={gated && summarySaving}
      loadingLabel="Saving…"
      onClick={() =>
        dispatch({
          type: "SET_STEP_STATUS",
          step,
          status: gated ? "approved" : approved ? "generated" : "approved",
        })
      }
      className={className}
    >
      {showApproved ? (
        "Approved"
      ) : (
        <>
          <span className="sm:hidden">Approve</span>
          <span className="hidden sm:inline">Mark approved</span>
        </>
      )}
    </ActionButton>
  );
}
