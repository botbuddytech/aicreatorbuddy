"use client";

import { ActionButton } from "@/components/ui/ActionButton";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import type { StepId } from "@/lib/videoProject";

export function StepApprove({ step }: { step: StepId }) {
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
    >
      {approved ? "Approved" : "Mark approved"}
    </ActionButton>
  );
}
