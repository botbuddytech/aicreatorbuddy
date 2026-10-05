"use client";

import type { AgentCheckpoint, FlashField, ProjectChange, ProjectSnapshot } from "@/lib/agent/types";
import { getProjectBridge } from "@/components/agent/bridge";
import { carryAgentChatsTo, useAgentStore } from "@/components/agent/store";
import { trackSessionEvent } from "@/lib/session/telemetry";
import { upsertProjectInStore } from "@/lib/useVideoProjectDraft";
import {
  createEmptyProject,
  createEmptyReference,
  createEmptyScene,
  DEFAULT_PROJECT_NAME,
  MAX_REFERENCES,
  newId,
  type StepId,
  type VideoProject,
} from "@/lib/videoProject";

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
    name: project.name,
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
        provider: payload.provider,
      }));
      dispatch({
        type: "SET_TITLES",
        titles,
        cursorPrompt: payload.provider === "cursor" ? payload.cursorPrompt : null,
      });
      const first = titles[0];
      if (first) dispatch({ type: "SELECT_TITLE", id: first.id });
      break;
    }
    case "script":
      dispatch({
        type: "SET_SCRIPT",
        script: payload.script,
        cursorPrompt: payload.cursorPrompt ?? null,
        generated: payload.generated === true,
      });
      break;
    case "thumbnail":
      dispatch({
        type: "ADD_THUMBNAIL",
        thumbnail: { id: newId(), concept: payload.concept, provider: "chatgpt" },
      });
      break;
    case "thumbnailPrompts":
      dispatch({
        type: "SET_THUMBNAILS",
        cursorPrompt: payload.cursorPrompt,
        thumbnails: payload.concepts.map((concept) => ({
          id: newId(),
          concept,
          provider: "cursor" as const,
        })),
      });
      break;
    case "titleScores":
      dispatch({
        type: "SET_TITLE_SCORES",
        scores: Object.fromEntries(
          payload.scores.map((item) => [item.id, { provider: "cursor" as const, score: item.score, rank: item.rank }]),
        ),
      });
      return true;
    case "scriptScore":
      dispatch({ type: "SET_SCRIPT_SCORE", score: payload.score });
      return true;
    case "visualPrompts": {
      const prompts = new Map(payload.prompts.map((item) => [item.id, item.prompt]));
      const scenes = bridge.getProject().scenes.map((scene) => {
        const prompt = prompts.get(scene.id);
        if (!prompt) return scene;
        return { ...scene, status: "generated" as const, visuals: { ...scene.visuals, description: prompt } };
      });
      dispatch({ type: "SET_SCENES", scenes, generated: true, keepStatus: true });
      return true;
    }
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
    case "name":
      dispatch({ type: "SET_NAME", name: payload.name });
      return true;
    case "addReference": {
      const current = bridge.getProject().summary.references;
      if (current.length >= MAX_REFERENCES) return false;
      if (current.some((item) => item.url.trim() === payload.url)) return true;
      dispatch({
        type: "UPDATE_SUMMARY",
        patch: {
          references: [...current, { ...createEmptyReference(), url: payload.url }],
        },
      });
      break;
    }
    case "referenceTranscript": {
      const current = bridge.getProject().summary.references;
      const url = payload.url.trim();
      const filled = {
        title: payload.title,
        transcript: payload.transcript,
        transcriptSource: "fetched" as const,
        fetchedUrl: url,
        lang: payload.lang,
        fetchedAt: payload.fetchedAt,
      };
      const existing = current.some((item) => item.url.trim() === url);
      if (!existing && current.length >= MAX_REFERENCES) return false;
      dispatch({
        type: "UPDATE_SUMMARY",
        patch: {
          references: existing
            ? current.map((item) => (item.url.trim() === url ? { ...item, ...filled } : item))
            : [...current, { ...createEmptyReference(), url, ...filled }],
        },
      });
      break;
    }
    case "duration":
      dispatch({ type: "UPDATE_SUMMARY", patch: { durationSeconds: payload.durationSeconds } });
      break;
    default: {
      const exhaustive: never = payload;
      return exhaustive;
    }
  }

  if (change.field !== "step" && change.field !== "name") {
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
  if (typeof snapshot.name === "string") {
    dispatch({ type: "SET_NAME", name: snapshot.name });
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
  if (change.payload.type === "name" || change.field === "name") return getProjectBridge()?.getStep() ?? "summary";
  if (change.field !== "step") return FIELD_STEP[change.field];
  return getProjectBridge()?.getStep() ?? "summary";
}

function applyOnto(project: VideoProject, change: ProjectChange): VideoProject {
  const payload = change.payload;
  const now = new Date().toISOString();
  switch (payload.type) {
    case "brief":
      return {
        ...project,
        lastUpdated: now,
        summary: { ...project.summary, topic: payload.topic },
      };
    case "titles": {
      const titles = payload.titles.map((text) => ({
        id: newId(),
        text,
        provider: payload.provider,
      }));
      const first = titles[0];
      return {
        ...project,
        lastUpdated: now,
        titles,
        selectedTitleId: first?.id ?? null,
        name: project.name === DEFAULT_PROJECT_NAME && first ? first.text : project.name,
        stepStatus: { ...project.stepStatus, title: "generated" },
      };
    }
    case "script":
      return {
        ...project,
        lastUpdated: now,
        fullScript: payload.script,
        cursorScriptPrompt: payload.cursorPrompt ?? project.cursorScriptPrompt,
        stepStatus: { ...project.stepStatus, script: "generated" },
      };
    case "titleScores":
      return {
        ...project,
        lastUpdated: now,
        titles: project.titles.map((title) => {
          const score = payload.scores.find((item) => item.id === title.id);
          return score ? { ...title, score: { provider: "cursor" as const, score: score.score, rank: score.rank } } : title;
        }),
      };
    case "scriptScore":
      return { ...project, lastUpdated: now, scriptScore: payload.score };
    case "thumbnailPrompts":
      return {
        ...project,
        lastUpdated: now,
        cursorThumbnailPrompt: payload.cursorPrompt,
        thumbnails: payload.concepts.map((concept) => ({ id: newId(), concept, provider: "cursor" as const })),
        stepStatus: { ...project.stepStatus, thumbnail: "generated" },
      };
    case "visualPrompts": {
      const prompts = new Map(payload.prompts.map((item) => [item.id, item.prompt]));
      return {
        ...project,
        lastUpdated: now,
        scenes: project.scenes.map((scene) => {
          const prompt = prompts.get(scene.id);
          if (!prompt) return scene;
          return { ...scene, status: "generated" as const, visuals: { ...scene.visuals, description: prompt } };
        }),
      };
    }
    case "thumbnail": {
      const thumbnail = { id: newId(), concept: payload.concept, provider: "manual" as const };
      return {
        ...project,
        lastUpdated: now,
        thumbnails: [...project.thumbnails, thumbnail],
        selectedThumbnailId: thumbnail.id,
        stepStatus: { ...project.stepStatus, thumbnail: "generated" },
      };
    }
    case "timeline":
      return {
        ...project,
        lastUpdated: now,
        scenes: payload.scenes.map((scene, index) =>
          createEmptyScene(index, {
            sectionLabel: scene.sectionLabel,
            finalScript: scene.finalScript,
            originalPrompt: scene.finalScript,
          }),
        ),
        stepStatus: { ...project.stepStatus, timeline: "generated" },
      };
    case "description":
      return {
        ...project,
        lastUpdated: now,
        description: payload.description,
        tags: payload.tags,
        stepStatus: { ...project.stepStatus, description: "generated" },
      };
    case "navigate":
      return project;
    case "approve":
      return {
        ...project,
        lastUpdated: now,
        stepStatus: { ...project.stepStatus, [payload.step]: "approved" },
      };
    case "name":
      return { ...project, lastUpdated: now, name: payload.name };
    case "addReference":
      if (project.summary.references.length >= MAX_REFERENCES) return project;
      if (project.summary.references.some((item) => item.url.trim() === payload.url)) return project;
      return {
        ...project,
        lastUpdated: now,
        summary: {
          ...project.summary,
          references: [...project.summary.references, { ...createEmptyReference(), url: payload.url }],
        },
      };
    case "referenceTranscript": {
      const url = payload.url.trim();
      const filled = {
        title: payload.title,
        transcript: payload.transcript,
        transcriptSource: "fetched" as const,
        fetchedUrl: url,
        lang: payload.lang,
        fetchedAt: payload.fetchedAt,
      };
      const existing = project.summary.references.some((item) => item.url.trim() === url);
      if (!existing && project.summary.references.length >= MAX_REFERENCES) return project;
      return {
        ...project,
        lastUpdated: now,
        summary: {
          ...project.summary,
          references: existing
            ? project.summary.references.map((item) =>
                item.url.trim() === url ? { ...item, ...filled } : item,
              )
            : [...project.summary.references, { ...createEmptyReference(), url, ...filled }],
        },
      };
    }
    case "duration":
      return {
        ...project,
        lastUpdated: now,
        summary: { ...project.summary, durationSeconds: payload.durationSeconds },
      };
    default: {
      const exhaustive: never = payload;
      return exhaustive;
    }
  }
}

function openNewVideo(changes: ProjectChange[]): { id: string; step: StepId } | null {
  let project = createEmptyProject();
  for (const change of changes) project = applyOnto(project, change);
  const last = changes.at(-1);
  if (!last) return null;
  upsertProjectInStore(project);
  trackSessionEvent(project.id, {
    type: "session.created",
    step: "summary",
    payload: { channelId: null, createdAt: project.createdAt },
  });
  return { id: project.id, step: stepForChange(last) };
}

function goToNewVideo(projectId: string, step: StepId) {
  carryAgentChatsTo(projectId);
  const query = step === "summary" ? "" : `?step=${step}`;
  window.location.assign(`/dashboard/create/${projectId}${query}`);
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
  if (!getProjectBridge()) {
    const created = openNewVideo([change]);
    if (!created) return;
    markChanges(threadId, messageId, new Set([changeId]), "accepted");
    goToNewVideo(created.id, created.step);
    return;
  }
  ensureCheckpoint(threadId, messageId, `Before ${change.label.toLowerCase()}`);
  if (!applyProjectChange(change)) return;
  markChanges(threadId, messageId, new Set([changeId]), "accepted");
  if (change.field !== "step" && change.field !== "name") useAgentStore.getState().pingFlash(change.field);
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
  if (!getProjectBridge()) {
    const created = openNewVideo(pending);
    if (!created) return;
    markChanges(threadId, messageId, new Set(pending.map((change) => change.id)), "accepted");
    goToNewVideo(created.id, created.step);
    return;
  }
  ensureCheckpoint(threadId, messageId, "Before this run");
  const applied = new Set<string>();
  for (const change of pending) {
    if (!applyProjectChange(change)) continue;
    applied.add(change.id);
    if (change.field !== "step" && change.field !== "name") useAgentStore.getState().pingFlash(change.field);
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
