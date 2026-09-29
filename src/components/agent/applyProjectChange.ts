"use client";

import type { AgentCheckpoint, FlashField, ProjectChange, ProjectSnapshot } from "@/lib/agent/types";
import { getProjectBridge } from "@/components/agent/bridge";
import { useAgentStore } from "@/components/agent/store";
import { createEmptyScene, newId, type StepId } from "@/lib/videoProject";

const FIELD_STEP: Record<FlashField, StepId> = {
  brief: "summary",
  title: "title",
  script: "script",
  thumbnail: "thumbnail",
  timeline: "timeline",
  description: "description",
};

function captureSnapshot(): ProjectSnapshot | null {
  const bridge = getProjectBridge();
  if (!bridge) return null;
  const project = bridge.getProject();
  return {
    summary: structuredClone(project.summary),
    titles: structuredClone(project.titles),
    selectedTitleId: project.selectedTitleId,
    thumbnails: structuredClone(project.thumbnails),
    selectedThumbnailId: project.selectedThumbnailId,
    fullScript: project.fullScript,
    scenes: structuredClone(project.scenes),
    description: project.description,
    tags: [...project.tags],
    stepStatus: { ...project.stepStatus },
    activeStep: bridge.getStep(),
  };
}

export function applyProjectChange(change: ProjectChange): boolean {
  const bridge = getProjectBridge();
  if (!bridge) return false;
  const { dispatch, setActiveStep, getStep } = bridge;
  const payload = change.payload;

  switch (payload.type) {
    case "brief":
      dispatch({ type: "UPDATE_SUMMARY", patch: { topic: payload.topic } });
      break;
    case "titles": {
      const titles = payload.titles.map((text) => ({
        id: newId(),
        text,
        provider: "chatgpt" as const,
      }));
      dispatch({ type: "SET_TITLES", titles });
      const first = titles[0];
      if (first) dispatch({ type: "SELECT_TITLE", id: first.id });
      break;
    }
    case "script":
      dispatch({ type: "SET_SCRIPT", script: payload.script });
      break;
    case "thumbnail":
      dispatch({
        type: "ADD_THUMBNAIL",
        thumbnail: { id: newId(), concept: payload.concept, provider: "chatgpt" },
      });
      break;
    case "timeline":
      dispatch({
        type: "SET_SCENES",
        scenes: payload.scenes.map((scene, index) =>
          createEmptyScene(index, {
            sectionLabel: scene.sectionLabel,
            finalScript: scene.finalScript,
            originalPrompt: scene.finalScript,
          }),
        ),
      });
      break;
    case "description":
      dispatch({
        type: "SET_DESCRIPTION",
        description: payload.description,
        tags: payload.tags,
      });
      break;
    case "navigate":
      if (getStep() !== payload.step) setActiveStep(payload.step);
      return true;
    case "approve":
      dispatch({ type: "SET_STEP_STATUS", step: payload.step, status: "approved" });
      if (getStep() !== payload.step) setActiveStep(payload.step);
      return true;
    default: {
      const exhaustive: never = payload;
      return exhaustive;
    }
  }

  if (change.field !== "step") {
    const step = FIELD_STEP[change.field];
    if (getStep() !== step) setActiveStep(step);
  }
  return true;
}

function restoreSnapshot(snapshot: ProjectSnapshot) {
  const bridge = getProjectBridge();
  if (!bridge) return;
  const { dispatch, setActiveStep, getStep } = bridge;
  dispatch({
    type: "UPDATE_SUMMARY",
    patch: {
      topic: snapshot.summary.topic,
      format: snapshot.summary.format,
      intent: snapshot.summary.intent,
      durationSeconds: snapshot.summary.durationSeconds,
      references: snapshot.summary.references,
    },
  });
  dispatch({ type: "SET_TITLES", titles: snapshot.titles });
  if (snapshot.selectedTitleId) {
    dispatch({ type: "SELECT_TITLE", id: snapshot.selectedTitleId });
  }
  dispatch({ type: "SET_THUMBNAILS", thumbnails: snapshot.thumbnails });
  if (snapshot.selectedThumbnailId) {
    dispatch({ type: "SELECT_THUMBNAIL", id: snapshot.selectedThumbnailId });
  }
  dispatch({ type: "SET_SCRIPT", script: snapshot.fullScript });
  dispatch({ type: "SET_SCENES", scenes: snapshot.scenes });
  dispatch({
    type: "SET_DESCRIPTION",
    description: snapshot.description,
    tags: snapshot.tags,
  });
  for (const step of Object.keys(snapshot.stepStatus) as StepId[]) {
    dispatch({ type: "SET_STEP_STATUS", step, status: snapshot.stepStatus[step] });
  }
  if (getStep() !== snapshot.activeStep) setActiveStep(snapshot.activeStep);
}

function ensureCheckpoint(threadId: string, messageId: string, label: string): string | null {
  const state = useAgentStore.getState();
  const thread = state.threads.find((item) => item.id === threadId);
  const message = thread?.messages.find((item) => item.id === messageId);
  if (!thread || !message) return null;
  if (message.checkpointId) return message.checkpointId;
  const snapshot = captureSnapshot();
  if (!snapshot) return null;
  const checkpoint: AgentCheckpoint = {
    id: newId(),
    messageId,
    label,
    createdAt: new Date().toISOString(),
    snapshot,
  };
  state.mutateThread(threadId, (current) => ({
    ...current,
    checkpoints: [...current.checkpoints, checkpoint],
    messages: current.messages.map((item) =>
      item.id === messageId ? { ...item, checkpointId: checkpoint.id } : item,
    ),
  }));
  return checkpoint.id;
}

function stepForChange(change: ProjectChange): StepId {
  if (change.payload.type === "navigate" || change.payload.type === "approve") return change.payload.step;
  if (change.field !== "step") return FIELD_STEP[change.field];
  return getProjectBridge()?.getStep() ?? "summary";
}

function postRunCost(threadId: string, messageId: string, step: StepId) {
  const state = useAgentStore.getState();
  const thread = state.threads.find((item) => item.id === threadId);
  const message = thread?.messages.find((item) => item.id === messageId);
  if (!message?.cost || message.costPosted) return;
  recordAgentCost(step, message.cost.usd);
  state.patchMessage(threadId, messageId, (current) => ({ ...current, costPosted: true }));
}

function markChanges(
  threadId: string,
  messageId: string,
  ids: Set<string>,
  status: "accepted" | "rejected",
) {
  useAgentStore.getState().patchMessage(threadId, messageId, (message) => ({
    ...message,
    changes: (message.changes ?? []).map((change) =>
      ids.has(change.id) ? { ...change, status } : change,
    ),
  }));
}

export function acceptChange(threadId: string, messageId: string, changeId: string) {
  const state = useAgentStore.getState();
  const thread = state.threads.find((item) => item.id === threadId);
  const message = thread?.messages.find((item) => item.id === messageId);
  const change = message?.changes?.find((item) => item.id === changeId);
  if (!message || !change || change.status !== "pending") return;
  ensureCheckpoint(threadId, messageId, `Before ${change.label.toLowerCase()}`);
  if (!applyProjectChange(change)) return;
  markChanges(threadId, messageId, new Set([changeId]), "accepted");
  if (change.field !== "step") useAgentStore.getState().pingFlash(change.field);
  postRunCost(threadId, messageId, stepForChange(change));
}

export function rejectChange(threadId: string, messageId: string, changeId: string) {
  markChanges(threadId, messageId, new Set([changeId]), "rejected");
}

export function acceptAllChanges(threadId: string, messageId: string) {
  const state = useAgentStore.getState();
  const thread = state.threads.find((item) => item.id === threadId);
  const message = thread?.messages.find((item) => item.id === messageId);
  const pending = message?.changes?.filter((change) => change.status === "pending") ?? [];
  if (pending.length === 0) return;
  ensureCheckpoint(threadId, messageId, "Before this run");
  const applied = new Set<string>();
  for (const change of pending) {
    if (!applyProjectChange(change)) continue;
    applied.add(change.id);
    if (change.field !== "step") useAgentStore.getState().pingFlash(change.field);
  }
  if (applied.size === 0) return;
  markChanges(threadId, messageId, applied, "accepted");
  const first = pending.find((change) => applied.has(change.id));
  if (first) postRunCost(threadId, messageId, stepForChange(first));
}

export function rejectAllChanges(threadId: string, messageId: string) {
  const state = useAgentStore.getState();
  const thread = state.threads.find((item) => item.id === threadId);
  const message = thread?.messages.find((item) => item.id === messageId);
  const pending = message?.changes?.filter((change) => change.status === "pending") ?? [];
  if (pending.length === 0) return;
  markChanges(threadId, messageId, new Set(pending.map((change) => change.id)), "rejected");
}

export function restoreCheckpoint(threadId: string, messageId: string) {
  const state = useAgentStore.getState();
  const thread = state.threads.find((item) => item.id === threadId);
  const message = thread?.messages.find((item) => item.id === messageId);
  if (!thread || !message?.checkpointId) return;
  const checkpoint = thread.checkpoints.find((item) => item.id === message.checkpointId);
  if (!checkpoint) return;
  restoreSnapshot(checkpoint.snapshot);
  state.mutateThread(threadId, (current) => ({
    ...current,
    checkpoints: current.checkpoints.filter((item) => item.id !== checkpoint.id),
    messages: current.messages.map((item) =>
      item.id === messageId
        ? {
            ...item,
            checkpointId: undefined,
            changes: (item.changes ?? []).map((change) =>
              change.status === "accepted" ? { ...change, status: "pending" } : change,
            ),
          }
        : item,
    ),
  }));
}

export function recordAgentCost(step: StepId, usd: number) {
  const bridge = getProjectBridge();
  if (!bridge) return;
  bridge.dispatch({
    type: "RECORD_API_COST",
    entry: {
      id: newId(),
      at: new Date().toISOString(),
      step,
      provider: "agent",
      kind: "agent-chat",
      usd,
    },
  });
}
