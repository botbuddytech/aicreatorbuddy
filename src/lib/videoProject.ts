import type { BadgeTone } from "@/components/ui/Badge";

export type AiProvider = "chatgpt" | "gemini" | "elevenlabs";

export type StepId =
  | "summary"
  | "title"
  | "thumbnail"
  | "script"
  | "timeline"
  | "description"
  | "render"
  | "editor";

export type StepStatus = "not-started" | "draft" | "generated" | "approved";
export type SceneStatus = "draft" | "generated" | "approved";

export type VideoFormat = "shorts" | "long-form";
export type AspectRatio = "9:16" | "16:9";
export type VideoIntent = "educational" | "entertainment";

export type ReferenceVideo = {
  id: string;
  url: string;
  transcript: string;
};

export type VideoSummary = {
  topic: string;
  format: VideoFormat;
  aspectRatio: AspectRatio;
  intent: VideoIntent;
  durationSeconds: number;
  references: ReferenceVideo[];
};

export const TEXT_PROVIDERS: AiProvider[] = ["chatgpt", "gemini"];

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  elevenlabs: "ElevenLabs",
};

export type TransitionId = "none" | "fade" | "dissolve" | "slide" | "wipe" | "zoom";
export type FilterId = "none" | "warm" | "cool" | "mono" | "vivid";
export type OverlayPosition = "top" | "center" | "bottom";

export type TextOverlay = {
  text: string;
  position: OverlayPosition;
};

export type SceneEditing = {
  notes: string;
  durationSeconds: number | null;
  transition: TransitionId;
  transitionSeconds: number;
  filter: FilterId;
  speed: number;
  volume: number;
  textOverlay: TextOverlay | null;
};

export type EditorSettings = {
  musicTrackId: string | null;
  musicVolume: number;
  captions: boolean;
  confirmedAt: string | null;
  exportedAt: string | null;
};

export const TRANSITION_OPTIONS: { id: TransitionId; label: string }[] = [
  { id: "none", label: "None" },
  { id: "fade", label: "Fade" },
  { id: "dissolve", label: "Dissolve" },
  { id: "slide", label: "Slide" },
  { id: "wipe", label: "Wipe" },
  { id: "zoom", label: "Zoom" },
];

export const FILTER_OPTIONS: { id: FilterId; label: string }[] = [
  { id: "none", label: "None" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
  { id: "mono", label: "Mono" },
  { id: "vivid", label: "Vivid" },
];

export const FILTER_CSS: Record<FilterId, string> = {
  none: "none",
  warm: "sepia(0.35) saturate(1.2) hue-rotate(-10deg)",
  cool: "saturate(0.9) hue-rotate(20deg) brightness(1.05)",
  mono: "grayscale(1)",
  vivid: "saturate(1.6) contrast(1.1)",
};

export const OVERLAY_POSITIONS: { id: OverlayPosition; label: string }[] = [
  { id: "top", label: "Top" },
  { id: "center", label: "Center" },
  { id: "bottom", label: "Bottom" },
];

export interface Scene {
  id: string;
  order: number;
  sectionLabel: string;
  originalPrompt: string;
  finalScript: string;
  voiceover: {
    provider: string | null;
    voiceId: string | null;
    audioUrl: string | null;
    status: "empty" | "generating" | "ready";
  };
  visuals: {
    description: string;
    stockFootageId: string | null;
    thumbnailUrl: string | null;
    needsCustomFootage: boolean;
  };
  editing: SceneEditing;
  status: SceneStatus;
}

export interface TitleOption {
  id: string;
  text: string;
  provider: AiProvider;
  vidiq?: VidIqTitleInsight;
}

export interface ThumbnailOption {
  id: string;
  concept: string;
  provider: AiProvider;
  customUrl?: string;
  vidiq?: VidIqThumbInsight;
}

export type VidIqGrade = "A" | "B" | "C" | "D";

export type VidIqTitleInsight = {
  score: number;
  grade: VidIqGrade;
  volume: string;
  competition: "Low" | "Medium" | "High";
  keywords: string[];
  predictedCtr: number;
};

export type VidIqThumbInsight = {
  ctr: number;
  grade: VidIqGrade;
  contrast: number;
  textDensity: "Low" | "Medium" | "High";
  facePresent: boolean;
  notes: string;
};

export type VidIqScriptInsight = {
  score: number;
  grade: VidIqGrade;
  hook: number;
  retention: number;
  keywordFit: number;
  cta: number;
  wordCount: number;
  spokenMinutes: number;
  keywords: string[];
  notes: string[];
  sourceHash: string;
};

export type ApiCostEntry = {
  id: string;
  at: string;
  step: StepId;
  provider: string;
  kind: string;
  usd: number;
};

export type LowEffortStep = "script" | "timeline" | "render";
export type LowEffortVerdict = "pass" | "warn" | "fail";

export type LowEffortFinding = {
  id: string;
  severity: "warn" | "fail";
  title: string;
  detail: string;
};

export type LowEffortReport = {
  checkedAt: string;
  scope: LowEffortStep;
  sourceHash: string;
  score: number;
  verdict: LowEffortVerdict;
  findings: LowEffortFinding[];
};

export interface VideoProject {
  id: string;
  name: string;
  channelId: string;
  summary: VideoSummary;
  titles: TitleOption[];
  selectedTitleId: string | null;
  thumbnails: ThumbnailOption[];
  selectedThumbnailId: string | null;
  fullScript: string;
  scriptVidiq?: VidIqScriptInsight;
  scenes: Scene[];
  description: string;
  tags: string[];
  providerByStep: Partial<Record<StepId, AiProvider>>;
  stepStatus: Record<StepId, StepStatus>;
  apiCosts: ApiCostEntry[];
  renderedAt: string | null;
  editor: EditorSettings;
  lowEffortByStep: Partial<Record<LowEffortStep, LowEffortReport>>;
  createdAt: string;
  lastUpdated: string;
}

export type StepMeta = {
  id: StepId;
  label: string;
  blurb: string;
  providers: AiProvider[];
};

export const STEPS: StepMeta[] = [
  {
    id: "summary",
    label: "Video intro",
    blurb: "Format, intent, length, and reference videos",
    providers: [],
  },
  {
    id: "title",
    label: "Title",
    blurb: "Generate, edit, and select a title",
    providers: TEXT_PROVIDERS,
  },
  {
    id: "thumbnail",
    label: "Thumbnail",
    blurb: "Concepts or a custom upload",
    providers: TEXT_PROVIDERS,
  },
  {
    id: "script",
    label: "Script",
    blurb: "Full video script draft",
    providers: TEXT_PROVIDERS,
  },
  {
    id: "timeline",
    label: "Timeline",
    blurb: "Break the script into editable scenes",
    providers: TEXT_PROVIDERS,
  },
  {
    id: "description",
    label: "Description",
    blurb: "YouTube copy, tags, and hashtags",
    providers: TEXT_PROVIDERS,
  },
  {
    id: "render",
    label: "Render",
    blurb: "Readiness checklist and Remotion export",
    providers: [],
  },
  {
    id: "editor",
    label: "Editor",
    blurb: "Trim, transitions, audio, and overlays",
    providers: [],
  },
];

export const MAX_REFERENCES = 5;

export const FORMAT_LABELS: Record<VideoFormat, string> = {
  shorts: "Shorts",
  "long-form": "Long form",
};

export const INTENT_LABELS: Record<VideoIntent, string> = {
  educational: "Educational",
  entertainment: "Entertainment",
};

export const SHORTS_LENGTH_SECONDS = [15, 30, 45, 60] as const;
export const LONG_FORM_LENGTH_MINUTES = [3, 5, 8, 10, 12, 15] as const;

const EMPTY_STEP_STATUS: Record<StepId, StepStatus> = {
  summary: "not-started",
  title: "not-started",
  thumbnail: "not-started",
  script: "not-started",
  timeline: "not-started",
  description: "not-started",
  render: "not-started",
  editor: "not-started",
};

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function aspectForFormat(format: VideoFormat): AspectRatio {
  return format === "shorts" ? "9:16" : "16:9";
}

export function defaultDurationForFormat(format: VideoFormat): number {
  return format === "shorts" ? 60 : 8 * 60;
}

export function lengthOptionsForFormat(format: VideoFormat): { value: number; label: string }[] {
  if (format === "shorts") {
    return SHORTS_LENGTH_SECONDS.map((seconds) => ({
      value: seconds,
      label: `${seconds} seconds`,
    }));
  }
  return LONG_FORM_LENGTH_MINUTES.map((minutes) => ({
    value: minutes * 60,
    label: `${minutes} minutes`,
  }));
}

export function formatDurationLabel(seconds: number, format: VideoFormat): string {
  if (format === "shorts") return `${seconds} seconds`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export function snapDurationToPreset(format: VideoFormat, seconds: number): number {
  const options = lengthOptionsForFormat(format);
  const first = options[0]?.value ?? defaultDurationForFormat(format);
  if (!Number.isFinite(seconds) || seconds <= 0) return first;
  return options.reduce(
    (best, option) =>
      Math.abs(option.value - seconds) < Math.abs(best - seconds) ? option.value : best,
    first,
  );
}

export function summaryLengthMinutes(summary: VideoSummary): number {
  return Math.max(summary.durationSeconds / 60, 1 / 60);
}

export function aspectClassName(aspect: AspectRatio): string {
  return aspect === "9:16" ? "aspect-[9/16]" : "aspect-video";
}

export function createEmptyReference(): ReferenceVideo {
  return { id: newId(), url: "", transcript: "" };
}

export function emptySummary(): VideoSummary {
  return {
    topic: "",
    format: "long-form",
    aspectRatio: "16:9",
    intent: "educational",
    durationSeconds: defaultDurationForFormat("long-form"),
    references: [],
  };
}

export function applySummaryPatch(
  current: VideoSummary,
  patch: Partial<VideoSummary>,
): VideoSummary {
  const format = patch.format ?? current.format;
  const switchingFormat = patch.format !== undefined && patch.format !== current.format;
  const durationSeconds =
    switchingFormat && patch.durationSeconds === undefined
      ? defaultDurationForFormat(format)
      : snapDurationToPreset(format, patch.durationSeconds ?? current.durationSeconds);
  const references = (patch.references ?? current.references).slice(0, MAX_REFERENCES);
  return {
    ...current,
    ...patch,
    format,
    aspectRatio: aspectForFormat(format),
    durationSeconds,
    references,
  };
}

type LegacySummary = Partial<VideoSummary> & {
  audience?: string;
  tone?: string;
  lengthMinutes?: number;
  goal?: string;
  sourceMaterial?: string;
};

export function normalizeSummary(raw: unknown): VideoSummary {
  const base = emptySummary();
  if (!raw || typeof raw !== "object") return base;
  const source = raw as LegacySummary;
  const format: VideoFormat = source.format === "shorts" ? "shorts" : "long-form";
  const intent: VideoIntent = source.intent === "entertainment" ? "entertainment" : "educational";

  let durationSeconds = base.durationSeconds;
  if (typeof source.durationSeconds === "number" && source.durationSeconds > 0) {
    durationSeconds = source.durationSeconds;
  } else if (typeof source.lengthMinutes === "number" && source.lengthMinutes > 0) {
    durationSeconds = Math.round(source.lengthMinutes * 60);
  }

  let references: ReferenceVideo[] = [];
  if (Array.isArray(source.references)) {
    references = source.references
      .filter((item): item is ReferenceVideo => Boolean(item && typeof item === "object"))
      .slice(0, MAX_REFERENCES)
      .map((item) => ({
        id: typeof item.id === "string" && item.id ? item.id : newId(),
        url: typeof item.url === "string" ? item.url : "",
        transcript: typeof item.transcript === "string" ? item.transcript : "",
      }));
  } else if (typeof source.sourceMaterial === "string" && source.sourceMaterial.trim()) {
    references = [{ id: newId(), url: "", transcript: source.sourceMaterial }];
  }

  return {
    topic: typeof source.topic === "string" ? source.topic : "",
    format,
    aspectRatio: aspectForFormat(format),
    intent,
    durationSeconds: snapDurationToPreset(format, durationSeconds),
    references,
  };
}

export function emptyEditing(): SceneEditing {
  return {
    notes: "",
    durationSeconds: null,
    transition: "none",
    transitionSeconds: 0.5,
    filter: "none",
    speed: 1,
    volume: 100,
    textOverlay: null,
  };
}

export function emptyEditorSettings(): EditorSettings {
  return {
    musicTrackId: null,
    musicVolume: 40,
    captions: true,
    confirmedAt: null,
    exportedAt: null,
  };
}

const TRANSITION_IDS: TransitionId[] = TRANSITION_OPTIONS.map((item) => item.id);
const FILTER_IDS: FilterId[] = FILTER_OPTIONS.map((item) => item.id);
const OVERLAY_IDS: OverlayPosition[] = OVERLAY_POSITIONS.map((item) => item.id);

function isTransitionId(value: unknown): value is TransitionId {
  return typeof value === "string" && TRANSITION_IDS.includes(value as TransitionId);
}

function isFilterId(value: unknown): value is FilterId {
  return typeof value === "string" && FILTER_IDS.includes(value as FilterId);
}

function isOverlayPosition(value: unknown): value is OverlayPosition {
  return typeof value === "string" && OVERLAY_IDS.includes(value as OverlayPosition);
}

export function normalizeEditing(raw: unknown): SceneEditing {
  const base = emptyEditing();
  if (!raw || typeof raw !== "object") return base;
  const source = raw as Partial<SceneEditing>;
  const durationSeconds =
    typeof source.durationSeconds === "number" && source.durationSeconds > 0
      ? source.durationSeconds
      : source.durationSeconds === null
        ? null
        : base.durationSeconds;
  const speed =
    typeof source.speed === "number" && source.speed > 0
      ? Math.min(2, Math.max(0.5, source.speed))
      : base.speed;
  const volume =
    typeof source.volume === "number" && Number.isFinite(source.volume)
      ? Math.min(100, Math.max(0, source.volume))
      : base.volume;
  const transitionSeconds =
    typeof source.transitionSeconds === "number" && source.transitionSeconds >= 0
      ? Math.min(2, source.transitionSeconds)
      : base.transitionSeconds;
  let textOverlay: TextOverlay | null = null;
  if (source.textOverlay && typeof source.textOverlay === "object") {
    const text = typeof source.textOverlay.text === "string" ? source.textOverlay.text : "";
    const position = isOverlayPosition(source.textOverlay.position)
      ? source.textOverlay.position
      : "bottom";
    if (text.trim()) textOverlay = { text, position };
  }
  return {
    notes: typeof source.notes === "string" ? source.notes : "",
    durationSeconds,
    transition: isTransitionId(source.transition) ? source.transition : base.transition,
    transitionSeconds,
    filter: isFilterId(source.filter) ? source.filter : base.filter,
    speed,
    volume,
    textOverlay,
  };
}

export function normalizeEditorSettings(raw: unknown): EditorSettings {
  const base = emptyEditorSettings();
  if (!raw || typeof raw !== "object") return base;
  const source = raw as Partial<EditorSettings>;
  return {
    musicTrackId: typeof source.musicTrackId === "string" ? source.musicTrackId : null,
    musicVolume:
      typeof source.musicVolume === "number" && Number.isFinite(source.musicVolume)
        ? Math.min(100, Math.max(0, source.musicVolume))
        : base.musicVolume,
    captions: typeof source.captions === "boolean" ? source.captions : base.captions,
    confirmedAt: typeof source.confirmedAt === "string" ? source.confirmedAt : null,
    exportedAt: typeof source.exportedAt === "string" ? source.exportedAt : null,
  };
}

const LOW_EFFORT_STEPS: LowEffortStep[] = ["script", "timeline", "render"];
const LOW_EFFORT_VERDICTS: LowEffortVerdict[] = ["pass", "warn", "fail"];

function isLowEffortStep(value: unknown): value is LowEffortStep {
  return typeof value === "string" && LOW_EFFORT_STEPS.includes(value as LowEffortStep);
}

function isLowEffortVerdict(value: unknown): value is LowEffortVerdict {
  return typeof value === "string" && LOW_EFFORT_VERDICTS.includes(value as LowEffortVerdict);
}

export function emptyLowEffortByStep(): Partial<Record<LowEffortStep, LowEffortReport>> {
  return {};
}

function normalizeLowEffortFinding(raw: unknown): LowEffortFinding | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Partial<LowEffortFinding>;
  if (typeof source.id !== "string" || !source.id) return null;
  if (source.severity !== "warn" && source.severity !== "fail") return null;
  if (typeof source.title !== "string" || typeof source.detail !== "string") return null;
  return {
    id: source.id,
    severity: source.severity,
    title: source.title,
    detail: source.detail,
  };
}

function normalizeLowEffortReport(raw: unknown, fallbackScope: LowEffortStep): LowEffortReport | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Partial<LowEffortReport>;
  const scope = isLowEffortStep(source.scope) ? source.scope : fallbackScope;
  if (typeof source.checkedAt !== "string" || typeof source.sourceHash !== "string") return null;
  if (typeof source.score !== "number" || !Number.isFinite(source.score)) return null;
  if (!isLowEffortVerdict(source.verdict)) return null;
  const findings = Array.isArray(source.findings)
    ? source.findings
        .map(normalizeLowEffortFinding)
        .filter((item): item is LowEffortFinding => Boolean(item))
    : [];
  return {
    checkedAt: source.checkedAt,
    scope,
    sourceHash: source.sourceHash,
    score: Math.min(100, Math.max(0, Math.round(source.score))),
    verdict: source.verdict,
    findings,
  };
}

export function normalizeLowEffortByStep(
  raw: unknown,
): Partial<Record<LowEffortStep, LowEffortReport>> {
  if (!raw || typeof raw !== "object") return emptyLowEffortByStep();
  const source = raw as Partial<Record<LowEffortStep, unknown>>;
  const next: Partial<Record<LowEffortStep, LowEffortReport>> = {};
  for (const step of LOW_EFFORT_STEPS) {
    const report = normalizeLowEffortReport(source[step], step);
    if (report) next[step] = report;
  }
  return next;
}

export function normalizeScenes(raw: unknown): Scene[] {
  if (!Array.isArray(raw)) return [];
  return reindexScenes(
    raw
      .filter((item): item is Scene => Boolean(item && typeof item === "object"))
      .map((item, index) => ({
        id: typeof item.id === "string" && item.id ? item.id : newId(),
        order: index,
        sectionLabel: typeof item.sectionLabel === "string" ? item.sectionLabel : `Scene ${index + 1}`,
        originalPrompt: typeof item.originalPrompt === "string" ? item.originalPrompt : "",
        finalScript: typeof item.finalScript === "string" ? item.finalScript : "",
        voiceover: {
          provider: item.voiceover?.provider ?? null,
          voiceId: item.voiceover?.voiceId ?? null,
          audioUrl: item.voiceover?.audioUrl ?? null,
          status: item.voiceover?.status === "ready" || item.voiceover?.status === "generating"
            ? item.voiceover.status
            : "empty",
        },
        visuals: {
          description: item.visuals?.description ?? "",
          stockFootageId: item.visuals?.stockFootageId ?? null,
          thumbnailUrl: item.visuals?.thumbnailUrl ?? null,
          needsCustomFootage: Boolean(item.visuals?.needsCustomFootage),
        },
        editing: normalizeEditing(item.editing),
        status:
          item.status === "generated" || item.status === "approved" ? item.status : "draft",
      })),
  );
}

export function normalizeStepStatus(raw: unknown): Record<StepId, StepStatus> {
  const base = { ...EMPTY_STEP_STATUS };
  if (!raw || typeof raw !== "object") return base;
  const source = raw as Partial<Record<StepId, StepStatus>>;
  for (const id of Object.keys(base) as StepId[]) {
    const value = source[id];
    if (
      value === "not-started" ||
      value === "draft" ||
      value === "generated" ||
      value === "approved"
    ) {
      base[id] = value;
    }
  }
  return base;
}

export const DEFAULT_PROJECT_NAME = "Untitled video";

export function createEmptyProject(partial?: {
  name?: string;
  channelId?: string;
}): VideoProject {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name: partial?.name ?? DEFAULT_PROJECT_NAME,
    channelId: partial?.channelId ?? "",
    summary: emptySummary(),
    titles: [],
    selectedTitleId: null,
    thumbnails: [],
    selectedThumbnailId: null,
    fullScript: "",
    scenes: [],
    description: "",
    tags: [],
    providerByStep: {
      title: "chatgpt",
      thumbnail: "chatgpt",
      script: "chatgpt",
      timeline: "chatgpt",
      description: "chatgpt",
    },
    stepStatus: { ...EMPTY_STEP_STATUS },
    apiCosts: [],
    renderedAt: null,
    editor: emptyEditorSettings(),
    lowEffortByStep: emptyLowEffortByStep(),
    createdAt: now,
    lastUpdated: now,
  };
}

export function createEmptyScene(
  order: number,
  patch: Partial<Pick<Scene, "sectionLabel" | "originalPrompt" | "finalScript">> = {},
): Scene {
  return {
    id: newId(),
    order,
    sectionLabel: patch.sectionLabel ?? `Scene ${order + 1}`,
    originalPrompt: patch.originalPrompt ?? "",
    finalScript: patch.finalScript ?? "",
    voiceover: {
      provider: null,
      voiceId: null,
      audioUrl: null,
      status: "empty",
    },
    visuals: {
      description: "",
      stockFootageId: null,
      thumbnailUrl: null,
      needsCustomFootage: false,
    },
    editing: emptyEditing(),
    status: "draft",
  };
}

export function selectedTitle(project: VideoProject): TitleOption | undefined {
  return project.titles.find((title) => title.id === project.selectedTitleId);
}

export function buildScenePrompt(
  scene: Scene,
  project: VideoProject,
  extra?: string,
): string {
  const parts = [
    scene.originalPrompt,
    project.summary.topic ? `Video topic: ${project.summary.topic}` : "",
    `Format: ${FORMAT_LABELS[project.summary.format]} (${project.summary.aspectRatio})`,
    `Intent: ${INTENT_LABELS[project.summary.intent]}`,
    extra ?? "",
  ].filter((part) => part.trim().length > 0);
  return parts.join("\n");
}

export type ReadinessItem = {
  id: StepId;
  label: string;
  complete: boolean;
  detail: string;
};

export function deriveReadiness(project: VideoProject): ReadinessItem[] {
  return [
    {
      id: "summary",
      label: "Video intro",
      complete: project.summary.topic.trim().length > 0,
      detail: "Topic filled in",
    },
    {
      id: "title",
      label: "Title",
      complete: Boolean(project.selectedTitleId),
      detail: "Title selected",
    },
    {
      id: "thumbnail",
      label: "Thumbnail",
      complete: Boolean(project.selectedThumbnailId),
      detail: "Thumbnail selected",
    },
    {
      id: "script",
      label: "Script",
      complete: project.fullScript.trim().length > 0,
      detail: "Script drafted",
    },
    {
      id: "timeline",
      label: "Timeline",
      complete: project.scenes.length > 0,
      detail: project.scenes.length ? `${project.scenes.length} scenes` : "No scenes yet",
    },
    {
      id: "description",
      label: "Description",
      complete: project.description.trim().length > 0,
      detail: "Description drafted",
    },
  ];
}

export function inferStepStatus(project: VideoProject): Record<StepId, StepStatus> {
  const prev = project.stepStatus;
  const renderReady = deriveReadiness(project).every((item) => item.complete);

  const inferred: Record<StepId, StepStatus> = {
    summary: project.summary.topic.trim() ? "draft" : "not-started",
    title: project.titles.length ? "generated" : "not-started",
    thumbnail: project.thumbnails.length ? "generated" : "not-started",
    script: project.fullScript.trim() ? "generated" : "not-started",
    timeline: project.scenes.length ? "generated" : "not-started",
    description: project.description.trim() ? "generated" : "not-started",
    render: project.renderedAt ? "generated" : renderReady ? "draft" : "not-started",
    editor: !project.renderedAt
      ? "not-started"
      : project.editor?.confirmedAt
        ? "approved"
        : "draft",
  };

  const next = { ...inferred };
  for (const id of Object.keys(inferred) as StepId[]) {
    if (prev[id] === "approved" && inferred[id] !== "not-started") {
      next[id] = "approved";
    }
  }
  return next;
}

export function stepStatusLabel(status: StepStatus): string {
  switch (status) {
    case "not-started":
      return "Not Started";
    case "draft":
      return "Draft";
    case "generated":
      return "Generated";
    case "approved":
      return "Approved";
  }
}

export function stepStatusTone(status: StepStatus): BadgeTone {
  switch (status) {
    case "not-started":
      return "muted";
    case "draft":
      return "amber";
    case "generated":
      return "blue";
    case "approved":
      return "success";
  }
}

export function sceneStatusTone(status: SceneStatus): BadgeTone {
  switch (status) {
    case "draft":
      return "amber";
    case "generated":
      return "blue";
    case "approved":
      return "success";
  }
}

export function providersForStep(stepId: StepId): AiProvider[] {
  return STEPS.find((step) => step.id === stepId)?.providers ?? [];
}

export function isPlaceholderProjectName(project: VideoProject): boolean {
  const name = project.name.trim();
  if (!name || name === DEFAULT_PROJECT_NAME) return true;
  const topic = project.summary.topic.trim();
  return Boolean(topic) && name === topic;
}

export function resolveProjectName(project: VideoProject): string {
  if (!isPlaceholderProjectName(project)) return project.name.trim();
  if (project.stepStatus.title === "approved") {
    const title = selectedTitle(project)?.text.trim();
    if (title) return title;
  }
  return DEFAULT_PROJECT_NAME;
}

export function projectDisplayName(project: VideoProject): string {
  const name = resolveProjectName(project);
  return name.length > 48 ? `${name.slice(0, 45)}…` : name;
}

export function reindexScenes(scenes: Scene[]): Scene[] {
  return scenes.map((scene, index) => ({ ...scene, order: index }));
}

export function cloneScene(scene: Scene, order: number): Scene {
  const copy = JSON.parse(JSON.stringify(scene)) as Scene;
  return { ...copy, id: newId(), order };
}

export function formatTimecode(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function sceneDuration(scene: Scene): number {
  return scene.editing.durationSeconds && scene.editing.durationSeconds > 0
    ? scene.editing.durationSeconds
    : 15;
}

export function sceneRuntimeSeconds(scene: Scene): number {
  const speed = scene.editing.speed && scene.editing.speed > 0 ? scene.editing.speed : 1;
  return sceneDuration(scene) / speed;
}

export function sceneTimeRange(
  scenes: Scene[],
  index: number,
): { start: number; end: number; label: string } {
  let start = 0;
  for (let i = 0; i < index; i += 1) {
    const scene = scenes[i];
    if (scene) start += sceneRuntimeSeconds(scene);
  }
  const current = scenes[index];
  const end = start + (current ? sceneRuntimeSeconds(current) : 0);
  return { start, end, label: `${formatTimecode(start)}–${formatTimecode(end)}` };
}

export function totalTimelineSeconds(scenes: Scene[]): number {
  return scenes.reduce((sum, scene) => sum + sceneRuntimeSeconds(scene), 0);
}

export function normalizeApiCosts(raw: unknown): ApiCostEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is ApiCostEntry => {
    if (!item || typeof item !== "object") return false;
    const entry = item as ApiCostEntry;
    return typeof entry.id === "string" && typeof entry.usd === "number" && Number.isFinite(entry.usd);
  });
}

export function totalEstimatedApiCost(project: VideoProject): number {
  return (project.apiCosts ?? []).reduce((sum, entry) => sum + entry.usd, 0);
}

export type ApiCostByTool = {
  tool: string;
  label: string;
  usd: number;
  calls: number;
};

const API_TOOL_LABELS: Record<string, string> = {
  ...PROVIDER_LABELS,
  vidiq: "VidIQ",
};

export function apiCostByTool(project: VideoProject): ApiCostByTool[] {
  const totals = new Map<string, ApiCostByTool>();
  for (const entry of project.apiCosts ?? []) {
    const tool = entry.provider || "unknown";
    const current = totals.get(tool);
    if (current) {
      current.usd += entry.usd;
      current.calls += 1;
      continue;
    }
    totals.set(tool, {
      tool,
      label: API_TOOL_LABELS[tool] ?? tool,
      usd: entry.usd,
      calls: 1,
    });
  }
  return [...totals.values()].sort(
    (a, b) => b.usd - a.usd || a.label.localeCompare(b.label),
  );
}

export function projectLengthStats(project: VideoProject): {
  targetSeconds: number;
  currentSeconds: number;
  hasTimeline: boolean;
  currentLabel: string;
  targetLabel: string;
} {
  const targetSeconds = Math.max(0, project.summary.durationSeconds);
  const hasTimeline = project.scenes.length > 0;
  const currentSeconds = hasTimeline ? totalTimelineSeconds(project.scenes) : targetSeconds;
  return {
    targetSeconds,
    currentSeconds,
    hasTimeline,
    currentLabel: formatTimecode(currentSeconds),
    targetLabel: formatTimecode(targetSeconds),
  };
}

export function visualsEditingText(scene: Scene): string {
  return [scene.visuals.description, scene.editing.notes].filter(Boolean).join(" ");
}

export function vidiqGradeTone(grade: VidIqGrade): BadgeTone {
  switch (grade) {
    case "A":
      return "success";
    case "B":
      return "blue";
    case "C":
      return "amber";
    case "D":
      return "accent";
  }
}

export function lowEffortVerdictTone(verdict: LowEffortVerdict): BadgeTone {
  switch (verdict) {
    case "pass":
      return "success";
    case "warn":
      return "amber";
    case "fail":
      return "accent";
  }
}
