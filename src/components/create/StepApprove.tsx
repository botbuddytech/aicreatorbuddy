"use client";

import { ActionButton } from "@/components/ui/ActionButton";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import type { StepId } from "@/lib/videoProject";

export function StepApprove({ step, className = "" }: { step: StepId; className?: string }) {
  const { project, dispatch } = useVideoProject();
  const approved = project.stepStatus[step] === "approved";

  return (
    <ActionButton
      variant={approved ? "secondary" : "primary"}
      onClick={() =>
        dispatch({
          type: "SET_STEP_STATUS",
          step,
          status: approved ? "generated" : "approved",
        })
      }
      className={className}
    >
      {approved ? (
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
