import type { ProjectAction } from "@/components/create/VideoProjectProvider";
import type { StepId, VideoProject } from "@/lib/videoProject";

type ProjectBridge = {
  dispatch: (action: ProjectAction) => void;
  setActiveStep: (step: StepId) => void;
  getProject: () => VideoProject;
  getStep: () => StepId;
};

let bridge: ProjectBridge | null = null;

export function registerProjectBridge(next: ProjectBridge) {
  bridge = next;
}

export function getProjectBridge(): ProjectBridge | null {
  return bridge;
}
