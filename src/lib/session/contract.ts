import type { StepId, StepStatus } from "@/lib/videoProject";
import type { SessionStepSnapshot } from "@/lib/session/stepData";

export const MAX_EVENTS_PER_BATCH = 100;
export const MAX_SCENES_PER_SNAPSHOT = 500;
export const MAX_ASSETS_PER_SNAPSHOT = 500;
export const MAX_REFERENCES_PER_SNAPSHOT = 5;
export const MAX_JSON_BYTES = 256 * 1024;

export const STEP_IDS: StepId[] = [
  "summary",
  "title",
  "thumbnail",
  "script",
  "timeline",
  "description",
  "render",
  "editor",
];

export type SessionEventInput = {
  clientEventId: string;
  type: string;
  step: StepId | null;
  at: string;
  sequence: number;
  payload: Record<string, unknown>;
};

export type SessionSceneSnapshot = {
  sceneKey: string;
  order: number;
  sectionLabel: string;
  status: string;
  durationSec: number;
  trimStartSec: number;
  transition: string;
  filter: string;
  speed: number;
  volume: number;
  hasClip: boolean;
  hasVoiceover: boolean;
  wordCount: number;
};

export type SessionAssetSnapshot = {
  localClipId: string;
  sceneKey: string | null;
  kind: "UPLOADED_CLIP" | "AI_IMAGE" | "VOICEOVER" | "CUSTOM_THUMBNAIL" | "STOCK";
  source: "MANUAL_UPLOAD" | "AI_GENERATED" | "STOCK" | "EXTERNAL_URL";
  addedAtStep: StepId;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  durationSec: number | null;
  storageUrl: string | null;
};

export type SessionApiCallSnapshot = {
  clientCallId: string;
  step: StepId;
  tool: string;
  kind: string;
  estimatedUsd: number;
  ok: boolean;
  latencyMs: number | null;
  at: string;
};

export type SessionCheckSnapshot = {
  scope: string;
  provider: "static" | "cursor";
  verdict: string;
  score: number;
  sourceHash: string;
  summary: string | null;
  findings: unknown[];
  checkedAt: string;
};

export type SessionReferenceSnapshot = {
  referenceKey: string;
  order: number;
  url: string;
  videoId: string | null;
  hasTranscript: boolean;
  charCount: number;
  wordCount: number;
};

export type SessionSnapshot = {
  id: string;
  name: string;
  currentStep: StepId;
  channelId: string | null;
  topic: string;
  format: string;
  aspectRatio: string;
  intent: string;
  targetDurationSec: number;
  referenceCount: number;
  sceneCount: number;
  timelineSeconds: number;
  approvedStepCount: number;
  estimatedCostUsd: number;
  renderedAt: string | null;
  createdAt: string;
  lastActiveAt: string;
  steps: SessionStepSnapshot[];
  scenes: SessionSceneSnapshot[];
  assets: SessionAssetSnapshot[];
  apiCalls: SessionApiCallSnapshot[];
  checks: SessionCheckSnapshot[];
  references: SessionReferenceSnapshot[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isStep(value: unknown): value is StepId {
  return typeof value === "string" && STEP_IDS.includes(value as StepId);
}

function isStepStatus(value: unknown): value is StepStatus {
  return (
    value === "not-started" ||
    value === "draft" ||
    value === "generated" ||
    value === "approved"
  );
}

export function parseEventBatch(raw: unknown): SessionEventInput[] | null {
  const source = isObject(raw) && Array.isArray(raw.events) ? raw.events : null;
  if (!source || source.length === 0 || source.length > MAX_EVENTS_PER_BATCH) return null;
  const events: SessionEventInput[] = [];
  for (const value of source) {
    if (!isObject(value) || !isObject(value.payload)) return null;
    if (
      typeof value.clientEventId !== "string" ||
      value.clientEventId.length > 100 ||
      typeof value.type !== "string" ||
      value.type.length > 100 ||
      !isIsoDate(value.at) ||
      typeof value.sequence !== "number" ||
      !Number.isInteger(value.sequence) ||
      (value.step !== null && !isStep(value.step))
    ) {
      return null;
    }
    if (JSON.stringify(value.payload).length > MAX_JSON_BYTES) return null;
    events.push(value as SessionEventInput);
  }
  return events;
}

export function parseSessionSnapshot(raw: unknown): SessionSnapshot | null {
  if (!isObject(raw) || JSON.stringify(raw).length > MAX_JSON_BYTES * 8) return null;
  if (
    typeof raw.id !== "string" ||
    typeof raw.name !== "string" ||
    !isStep(raw.currentStep) ||
    typeof raw.topic !== "string" ||
    typeof raw.format !== "string" ||
    typeof raw.aspectRatio !== "string" ||
    typeof raw.intent !== "string" ||
    !isIsoDate(raw.createdAt) ||
    !isIsoDate(raw.lastActiveAt) ||
    !Array.isArray(raw.steps) ||
    !Array.isArray(raw.scenes) ||
    !Array.isArray(raw.assets) ||
    !Array.isArray(raw.apiCalls) ||
    !Array.isArray(raw.checks) ||
    !Array.isArray(raw.references) ||
    raw.scenes.length > MAX_SCENES_PER_SNAPSHOT ||
    raw.assets.length > MAX_ASSETS_PER_SNAPSHOT ||
    raw.checks.length > 20 ||
    raw.references.length > MAX_REFERENCES_PER_SNAPSHOT
  ) {
    return null;
  }
  for (const step of raw.steps) {
    if (!isObject(step) || !isStep(step.step) || !isStepStatus(step.state) || !isObject(step.data)) {
      return null;
    }
  }
  for (const check of raw.checks) {
    if (
      !isObject(check) ||
      typeof check.scope !== "string" ||
      (check.provider !== "static" && check.provider !== "cursor") ||
      typeof check.verdict !== "string" ||
      typeof check.score !== "number" ||
      !Number.isInteger(check.score) ||
      check.score < 0 ||
      check.score > 100 ||
      typeof check.sourceHash !== "string" ||
      (check.summary !== null &&
        (typeof check.summary !== "string" || check.summary.length > 500)) ||
      !Array.isArray(check.findings) ||
      check.findings.length > 20 ||
      !isIsoDate(check.checkedAt)
    ) {
      return null;
    }
  }
  for (const reference of raw.references) {
    if (
      !isObject(reference) ||
      typeof reference.referenceKey !== "string" ||
      typeof reference.order !== "number" ||
      !Number.isInteger(reference.order) ||
      typeof reference.url !== "string" ||
      (reference.videoId !== null && typeof reference.videoId !== "string") ||
      typeof reference.hasTranscript !== "boolean" ||
      typeof reference.charCount !== "number" ||
      typeof reference.wordCount !== "number"
    ) {
      return null;
    }
  }
  return raw as unknown as SessionSnapshot;
}
