import type {
  AiProvider,
  AspectRatio,
  EditorSettings,
  Scene,
  ScriptScore,
  StepId,
  StepStatus,
  ThumbnailOption,
  TitleOption,
  TitleScore,
  VideoFormat,
  VideoIntent,
  VideoProject,
  ReferenceVideo,
} from "@/lib/videoProject";
import {
  createEmptyProject,
  referenceTitleFromMetadata,
  normalizeEditorSettings,
  normalizeScenes,
  normalizeScriptScore,
  normalizeStepStatus,
  normalizeSummary,
  normalizeTitles,
} from "@/lib/videoProject";

/** Working-document schema written by the create-video sync path. */
export const STEP_PAYLOAD_SCHEMA_VERSION = 1;

export type SummaryStepPayload = {
  channelId: string | null;
  topic: string;
  format: string;
  aspectRatio: string;
  intent: string;
  targetDurationSec: number;
  referenceKeys: string[];
};

export type TitleStepPayload = {
  titles: Array<{
    id: string;
    text: string;
    provider: string;
    score?: TitleScore;
  }>;
  selectedTitleId: string | null;
};

export type ThumbnailStepPayload = {
  thumbnails: Array<{
    id: string;
    concept: string;
    provider: string;
    customUrl?: string;
    vidiq?: Record<string, unknown>;
  }>;
  selectedThumbnailId: string | null;
};

export type ScriptStepPayload = {
  fullScript: string;
  scriptScore: ScriptScore | null;
};

export type TimelineStepPayload = {
  scenes: Scene[];
};

export type DescriptionStepPayload = {
  description: string;
  tags: string[];
};

export type RenderStepPayload = {
  renderedAt: string | null;
};

export type EditorStepPayload = {
  musicTrackId: string | null;
  musicVolume: number;
  captions: boolean;
  confirmedAt: string | null;
  exportedAt: string | null;
};

export type StepPayloadById = {
  summary: SummaryStepPayload;
  title: TitleStepPayload;
  thumbnail: ThumbnailStepPayload;
  script: ScriptStepPayload;
  timeline: TimelineStepPayload;
  description: DescriptionStepPayload;
  render: RenderStepPayload;
  editor: EditorStepPayload;
};

export type StepPayloadDocument<T extends StepId = StepId> = {
  step: T;
  schemaVersion: number;
  payload: StepPayloadById[T] & Record<string, unknown>;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Structural checks for known fields. Returns the original object on success so
 * unknown keys from newer clients are preserved.
 */
export function parseStepPayload<T extends StepId>(
  step: T,
  raw: unknown,
): (StepPayloadById[T] & Record<string, unknown>) | null {
  if (!isObject(raw)) return null;

  switch (step) {
    case "summary": {
      if (
        !isNullableString(raw.channelId) ||
        typeof raw.topic !== "string" ||
        typeof raw.format !== "string" ||
        typeof raw.aspectRatio !== "string" ||
        typeof raw.intent !== "string" ||
        !isFiniteNumber(raw.targetDurationSec) ||
        !Array.isArray(raw.referenceKeys) ||
        !raw.referenceKeys.every((item) => typeof item === "string")
      ) {
        return null;
      }
      return raw as StepPayloadById[T] & Record<string, unknown>;
    }
    case "title": {
      if (
        !Array.isArray(raw.titles) ||
        !raw.titles.every(
          (item) =>
            isObject(item) &&
            isNonEmptyString(item.id) &&
            typeof item.text === "string" &&
            typeof item.provider === "string",
        ) ||
        !isNullableString(raw.selectedTitleId)
      ) {
        return null;
      }
      return raw as StepPayloadById[T] & Record<string, unknown>;
    }
    case "thumbnail": {
      if (
        !Array.isArray(raw.thumbnails) ||
        !raw.thumbnails.every(
          (item) =>
            isObject(item) &&
            isNonEmptyString(item.id) &&
            typeof item.concept === "string" &&
            typeof item.provider === "string",
        ) ||
        !isNullableString(raw.selectedThumbnailId)
      ) {
        return null;
      }
      return raw as StepPayloadById[T] & Record<string, unknown>;
    }
    case "script": {
      if (typeof raw.fullScript !== "string") return null;
      if (raw.scriptScore !== null && !isObject(raw.scriptScore)) return null;
      return raw as StepPayloadById[T] & Record<string, unknown>;
    }
    case "timeline": {
      if (!Array.isArray(raw.scenes)) return null;
      return raw as StepPayloadById[T] & Record<string, unknown>;
    }
    case "description": {
      if (
        typeof raw.description !== "string" ||
        !Array.isArray(raw.tags) ||
        !raw.tags.every((item) => typeof item === "string")
      ) {
        return null;
      }
      return raw as StepPayloadById[T] & Record<string, unknown>;
    }
    case "render": {
      if (!isNullableString(raw.renderedAt)) return null;
      return raw as StepPayloadById[T] & Record<string, unknown>;
    }
    case "editor": {
      if (
        !isNullableString(raw.musicTrackId) ||
        !isFiniteNumber(raw.musicVolume) ||
        typeof raw.captions !== "boolean" ||
        !isNullableString(raw.confirmedAt) ||
        !isNullableString(raw.exportedAt)
      ) {
        return null;
      }
      return raw as StepPayloadById[T] & Record<string, unknown>;
    }
    default:
      return null;
  }
}

export function buildStepPayloads(project: VideoProject): {
  [K in StepId]: StepPayloadById[K] & Record<string, unknown>;
} {
  return {
    summary: {
      channelId: project.channelId || null,
      topic: project.summary.topic,
      format: project.summary.format,
      aspectRatio: project.summary.aspectRatio,
      intent: project.summary.intent,
      targetDurationSec: project.summary.durationSeconds,
      referenceKeys: project.summary.references.map((item) => item.id),
    },
    title: {
      titles: project.titles.map((title) => ({
        id: title.id,
        text: title.text,
        provider: title.provider,
        ...(title.score ? { score: title.score } : {}),
      })),
      selectedTitleId: project.selectedTitleId,
    },
    thumbnail: {
      thumbnails: project.thumbnails.map((item) => ({
        id: item.id,
        concept: item.concept,
        provider: item.provider,
        ...(item.customUrl ? { customUrl: item.customUrl } : {}),
        ...(item.vidiq ? { vidiq: { ...item.vidiq } } : {}),
      })),
      selectedThumbnailId: project.selectedThumbnailId,
    },
    script: {
      fullScript: project.fullScript,
      scriptScore: project.scriptScore ? { ...project.scriptScore } : null,
    },
    timeline: {
      scenes: project.scenes,
    },
    description: {
      description: project.description,
      tags: project.tags,
    },
    render: {
      renderedAt: project.renderedAt,
    },
    editor: {
      musicTrackId: project.editor.musicTrackId,
      musicVolume: project.editor.musicVolume,
      captions: project.editor.captions,
      confirmedAt: project.editor.confirmedAt,
      exportedAt: project.editor.exportedAt,
    },
  };
}

export type SessionReferenceDocument = {
  referenceKey: string;
  order: number;
  url: string;
  videoId: string | null;
  status: string;
  source: string;
  lang: string | null;
  transcript: string;
  charCount: number;
  wordCount: number;
  durationSec: number | null;
  fetchedAt: string | null;
  metadata: Record<string, unknown>;
};

export type SessionStepDocument = {
  step: StepId;
  state: StepStatus;
  provider: string | null;
  schemaVersion: number;
  payload: Record<string, unknown>;
};

export type SessionDocuments = {
  id: string;
  name: string;
  createdAt: string;
  lastActiveAt: string;
  steps: SessionStepDocument[];
  references: SessionReferenceDocument[];
};

function asAiProvider(value: string | null | undefined): AiProvider | undefined {
  if (value === "chatgpt" || value === "gemini" || value === "elevenlabs") return value;
  return undefined;
}

function referenceFromDocument(doc: SessionReferenceDocument): ReferenceVideo {
  const source =
    doc.source === "fetched" || doc.source === "manual" ? doc.source : null;
  return {
    id: doc.referenceKey,
    url: doc.url,
    title: referenceTitleFromMetadata(doc.metadata),
    transcript: doc.transcript,
    transcriptSource: source,
    fetchedUrl: source === "fetched" ? doc.url : null,
    lang: doc.lang,
    fetchedAt: doc.fetchedAt,
  };
}

/**
 * Rebuild a VideoProject from versioned step payloads + reference rows.
 * Returns null when no step has schemaVersion >= 1 (legacy metrics-only rows).
 */
export function projectFromSessionDocuments(docs: SessionDocuments): VideoProject | null {
  const hasWorkingDocument = docs.steps.some((step) => step.schemaVersion >= 1);
  if (!hasWorkingDocument) return null;

  const byStep = new Map(docs.steps.map((step) => [step.step, step]));
  const base = createEmptyProject({ name: docs.name });
  base.id = docs.id;
  base.createdAt = docs.createdAt;
  base.lastUpdated = docs.lastActiveAt;

  const stepStatus = normalizeStepStatus(
    Object.fromEntries(docs.steps.map((step) => [step.step, step.state])),
  );
  base.stepStatus = stepStatus;

  const providerByStep: VideoProject["providerByStep"] = { ...base.providerByStep };
  for (const step of docs.steps) {
    const provider = asAiProvider(step.provider);
    if (provider) providerByStep[step.step] = provider;
  }
  base.providerByStep = providerByStep;

  const summaryDoc = byStep.get("summary");
  if (summaryDoc && summaryDoc.schemaVersion >= 1) {
    const payload = parseStepPayload("summary", summaryDoc.payload);
    if (payload) {
      const refsByKey = new Map(
        docs.references.map((item) => [item.referenceKey, referenceFromDocument(item)]),
      );
      const orderedRefs = payload.referenceKeys
        .map((key) => refsByKey.get(key))
        .filter((item): item is ReferenceVideo => Boolean(item));
      for (const ref of docs.references) {
        if (!payload.referenceKeys.includes(ref.referenceKey)) {
          orderedRefs.push(referenceFromDocument(ref));
        }
      }
      base.channelId = payload.channelId ?? "";
      base.summary = normalizeSummary({
        topic: payload.topic,
        format: payload.format as VideoFormat,
        aspectRatio: payload.aspectRatio as AspectRatio,
        intent: payload.intent as VideoIntent,
        durationSeconds: payload.targetDurationSec,
        references: orderedRefs,
      });
    }
  } else if (docs.references.length) {
    base.summary = normalizeSummary({
      ...base.summary,
      references: docs.references
        .slice()
        .sort((a, b) => a.order - b.order)
        .map(referenceFromDocument),
    });
  }

  const titleDoc = byStep.get("title");
  if (titleDoc && titleDoc.schemaVersion >= 1) {
    const payload = parseStepPayload("title", titleDoc.payload);
    if (payload) {
      base.titles = normalizeTitles(payload.titles as TitleOption[]);
      base.selectedTitleId =
        typeof payload.selectedTitleId === "string" ? payload.selectedTitleId : null;
    }
  }

  const thumbnailDoc = byStep.get("thumbnail");
  if (thumbnailDoc && thumbnailDoc.schemaVersion >= 1) {
    const payload = parseStepPayload("thumbnail", thumbnailDoc.payload);
    if (payload) {
      base.thumbnails = (payload.thumbnails as ThumbnailOption[]).map((item) => ({
        id: item.id,
        concept: item.concept,
        provider:
          item.provider === "chatgpt" || item.provider === "gemini"
            ? item.provider
            : "chatgpt",
        ...(item.customUrl ? { customUrl: item.customUrl } : {}),
        ...(item.vidiq ? { vidiq: item.vidiq as ThumbnailOption["vidiq"] } : {}),
      }));
      base.selectedThumbnailId =
        typeof payload.selectedThumbnailId === "string"
          ? payload.selectedThumbnailId
          : null;
    }
  }

  const scriptDoc = byStep.get("script");
  if (scriptDoc && scriptDoc.schemaVersion >= 1) {
    const payload = parseStepPayload("script", scriptDoc.payload);
    if (payload) {
      base.fullScript = payload.fullScript;
      base.scriptScore = normalizeScriptScore(payload.scriptScore ?? undefined);
    }
  }

  const timelineDoc = byStep.get("timeline");
  if (timelineDoc && timelineDoc.schemaVersion >= 1) {
    const payload = parseStepPayload("timeline", timelineDoc.payload);
    if (payload) {
      base.scenes = normalizeScenes(payload.scenes);
    }
  }

  const descriptionDoc = byStep.get("description");
  if (descriptionDoc && descriptionDoc.schemaVersion >= 1) {
    const payload = parseStepPayload("description", descriptionDoc.payload);
    if (payload) {
      base.description = payload.description;
      base.tags = payload.tags;
    }
  }

  const renderDoc = byStep.get("render");
  if (renderDoc && renderDoc.schemaVersion >= 1) {
    const payload = parseStepPayload("render", renderDoc.payload);
    if (payload) {
      base.renderedAt = payload.renderedAt;
    }
  }

  const editorDoc = byStep.get("editor");
  if (editorDoc && editorDoc.schemaVersion >= 1) {
    const payload = parseStepPayload("editor", editorDoc.payload);
    if (payload) {
      const editor: EditorSettings = normalizeEditorSettings({
        musicTrackId: payload.musicTrackId,
        musicVolume: payload.musicVolume,
        captions: payload.captions,
        confirmedAt: payload.confirmedAt,
        exportedAt: payload.exportedAt,
      });
      base.editor = editor;
    }
  }

  return base;
}

export function shouldPreferServerDocuments(
  local: VideoProject | null,
  docs: SessionDocuments | null,
): boolean {
  if (!docs) return false;
  const serverProject = projectFromSessionDocuments(docs);
  if (!serverProject) return false;
  if (!local) return true;
  const localMs = Date.parse(local.lastUpdated);
  const serverMs = Date.parse(docs.lastActiveAt);
  if (Number.isNaN(serverMs)) return false;
  if (Number.isNaN(localMs)) return true;
  return serverMs > localMs;
}
