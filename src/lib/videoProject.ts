import type { BadgeTone } from "@/components/ui/Badge";
import type { VisualStyleId, VisualStylePromptMap } from "@/lib/visualStyles";
import { transitionSpanFrames } from "@/remotion/cutTransition";
import {
  clampFontSize,
  DEFAULT_CAPTION_FONT_SIZE,
  DEFAULT_CAPTION_FONT_WEIGHT,
  DEFAULT_OVERLAY_FONT_SIZE,
  DEFAULT_OVERLAY_FONT_WEIGHT,
  normalizeVideoFontId,
  normalizeVideoFontWeight,
  type VideoFontId,
  type VideoFontWeight,
} from "@/remotion/fontCatalog";
import { FACELESS_FPS } from "@/remotion/types";

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

export type IntentCategory = {
  id: string;
  label: string;
};

export const INTENT_CATEGORIES: Record<VideoIntent, readonly IntentCategory[]> = {
  educational: [
    { id: "explainer", label: "Explainer" },
    { id: "whiteboard", label: "Whiteboard" },
    { id: "presentation", label: "Presentation / Slides" },
    { id: "talking-head", label: "Talking Head" },
    { id: "screen-recording", label: "Screen Recording" },
    { id: "tutorial", label: "Tutorial / How-To" },
    { id: "animated-education", label: "Animated Education" },
    { id: "infographic", label: "Infographic" },
    { id: "documentary", label: "Documentary / Educational Story" },
    { id: "news", label: "News / Current Affairs" },
    { id: "course", label: "Course / Lecture" },
    { id: "quiz", label: "Quiz / Trivia" },
    { id: "case-study", label: "Case Study" },
    { id: "language-learning", label: "Language Learning" },
  ],
  entertainment: [
    { id: "ugc", label: "UGC" },
    { id: "storytelling", label: "Storytelling" },
    { id: "comedy", label: "Comedy" },
    { id: "meme", label: "Meme" },
    { id: "reaction", label: "Reaction" },
    { id: "faceless", label: "Faceless" },
    { id: "cinematic", label: "Cinematic" },
    { id: "character-animation", label: "Character / AI Animation" },
    { id: "shorts", label: "Shorts / Reels" },
    { id: "list", label: "List / Top X" },
    { id: "facts", label: "Facts" },
    { id: "mystery", label: "Mystery / Horror" },
    { id: "celebrity", label: "Celebrity / Pop Culture" },
    { id: "gaming", label: "Gaming" },
    { id: "music", label: "Music" },
    { id: "travel", label: "Travel / Lifestyle" },
    { id: "sports", label: "Sports" },
    { id: "asmr", label: "ASMR / Satisfying" },
  ],
};

export function normalizeIntentCategory(intent: VideoIntent, value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  if (!id) return null;
  return INTENT_CATEGORIES[intent].some((item) => item.id === id) ? id : null;
}

export function intentCategoryLabel(intent: VideoIntent, category: string | null): string | null {
  if (!category) return null;
  return INTENT_CATEGORIES[intent].find((item) => item.id === category)?.label ?? null;
}

export const MAX_REFERENCE_TITLE_CHARS = 200;

export type ReferenceVideo = {
  id: string;
  url: string;
  title: string;
  transcript: string;
  transcriptSource: "manual" | "fetched" | null;
  fetchedUrl: string | null;
  lang: string | null;
  fetchedAt: string | null;
};

export function referenceTitleFromMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const title = (metadata as Record<string, unknown>).title;
  return typeof title === "string" ? title.trim().slice(0, MAX_REFERENCE_TITLE_CHARS) : "";
}

export function metadataWithReferenceTitle(
  metadata: unknown,
  title: string,
): Record<string, unknown> {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  const trimmed = title.trim().slice(0, MAX_REFERENCE_TITLE_CHARS);
  if (trimmed) base.title = trimmed;
  else delete base.title;
  return base;
}

export type VideoSummary = {
  topic: string;
  format: VideoFormat;
  aspectRatio: AspectRatio;
  intent: VideoIntent;
  intentCategory: string | null;
  durationSeconds: number;
  references: ReferenceVideo[];
};

export const TEXT_PROVIDERS: AiProvider[] = ["chatgpt", "gemini"];

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  elevenlabs: "ElevenLabs",
};

export type TransitionId =
  | "none"
  | "fade"
  | "dissolve"
  | "slide"
  | "wipe"
  | "zoom"
  | "flip";
export type FilterId =
  | "none"
  | "warm"
  | "cool"
  | "mono"
  | "vivid"
  | "cinematic"
  | "golden"
  | "teal"
  | "noir"
  | "faded"
  | "punch"
  | "midnight"
  | "sepia"
  | "highkey"
  | "lowkey"
  | "bleach"
  | "forest";
export type OverlayPosition = "top" | "center" | "bottom";

export type TextOverlay = {
  text: string;
  position: OverlayPosition;
  /** Null keeps the system font until a Google face is chosen. */
  fontId: VideoFontId | null;
  fontWeight: VideoFontWeight;
  fontSize: number;
};

export type {
  VideoFontId,
  VideoFontWeight,
} from "@/remotion/fontCatalog";

export type SceneEditing = {
  notes: string;
  durationSeconds: number | null;
  /** Length assigned when the script was split. A clip upload cannot change this. */
  scriptDurationSeconds: number | null;
  /** In-point inside the source clip, in source seconds. Head trim, not a timeline offset. */
  trimStartSeconds: number;
  /** Plays as this clip begins. */
  transitionIn: TransitionId;
  transitionInSeconds: number;
  /** Plays as this clip ends. Older drafts stored this as `transition`. */
  transition: TransitionId;
  transitionSeconds: number;
  filter: FilterId;
  speed: number;
  volume: number;
  /** Uploaded clip sound. Defaults to muted so the AI voice is what you hear. */
  clipMuted: boolean;
  /**
   * Measured spoken length. The scene plays this long: a longer clip is trimmed,
   * and a shorter clip holds its last frame until the voice ends.
   */
  voiceSeconds: number | null;
  textOverlay: TextOverlay | null;
};

export type EditorSettings = {
  musicTrackId: string | null;
  musicVolume: number;
  captions: boolean;
  captionFontId: VideoFontId | null;
  captionFontWeight: VideoFontWeight;
  captionFontSize: number;
  confirmedAt: string | null;
  exportedAt: string | null;
  /** Successful MP4 exports. The next file is this count plus one. */
  exportCount: number;
};

export const TRANSITION_OPTIONS: { id: TransitionId; label: string }[] = [
  { id: "none", label: "None" },
  { id: "fade", label: "Fade (Remotion)" },
  { id: "dissolve", label: "Dissolve (Remotion)" },
  { id: "slide", label: "Slide (Remotion)" },
  { id: "wipe", label: "Wipe (Remotion)" },
  { id: "zoom", label: "Cross zoom (Remotion)" },
  { id: "flip", label: "Flip (Remotion)" },
];

export const FILTER_OPTIONS: { id: FilterId; label: string }[] = [
  { id: "none", label: "None" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
  { id: "golden", label: "Golden" },
  { id: "teal", label: "Teal & orange" },
  { id: "vivid", label: "Vivid" },
  { id: "punch", label: "Punch" },
  { id: "cinematic", label: "Cinematic" },
  { id: "faded", label: "Faded" },
  { id: "highkey", label: "High key" },
  { id: "lowkey", label: "Low key" },
  { id: "mono", label: "Mono" },
  { id: "noir", label: "Noir" },
  { id: "sepia", label: "Sepia" },
  { id: "midnight", label: "Midnight" },
  { id: "forest", label: "Forest" },
  { id: "bleach", label: "Bleach bypass" },
];

/** Standard CSS filters on clip layers (preview + @remotion/web-renderer export). */
export const FILTER_CSS: Record<FilterId, string> = {
  none: "none",
  warm: "sepia(0.35) saturate(1.2) hue-rotate(-10deg)",
  cool: "saturate(0.9) hue-rotate(20deg) brightness(1.05)",
  golden: "sepia(0.28) saturate(1.35) brightness(1.06) contrast(1.05)",
  teal: "saturate(1.15) hue-rotate(168deg) contrast(1.08)",
  mono: "grayscale(1)",
  vivid: "saturate(1.6) contrast(1.1)",
  punch: "saturate(1.85) contrast(1.18) brightness(1.02)",
  cinematic: "contrast(1.12) saturate(0.82) brightness(0.96)",
  faded: "contrast(0.88) brightness(1.12) saturate(0.72)",
  highkey: "brightness(1.18) contrast(0.92) saturate(0.95)",
  lowkey: "brightness(0.82) contrast(1.18) saturate(0.9)",
  noir: "grayscale(0.95) contrast(1.45) brightness(0.88)",
  sepia: "sepia(0.72) saturate(0.9)",
  midnight: "brightness(0.72) saturate(1.25) hue-rotate(195deg) contrast(1.1)",
  forest: "saturate(1.1) hue-rotate(95deg) contrast(1.05) brightness(0.98)",
  bleach: "contrast(1.35) saturate(0.45) brightness(1.08)",
};

export const OVERLAY_POSITIONS: { id: OverlayPosition; label: string }[] = [
  { id: "top", label: "Top" },
  { id: "center", label: "Center" },
  { id: "bottom", label: "Bottom" },
];

/** Direct uses one clip prompt. Still uses an image prompt, a start image, and a clip prompt. */
export type ClipSource = "direct" | "still";

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
    /** Clip prompt. A video tool uses this alone, or together with the start image. */
    description: string;
    clipSource: ClipSource;
    /** Opening-frame prompt. Used when clipSource is still. */
    imagePrompt: string;
    startFrameId: string | null;
    startFrameName: string | null;
    /** Object path in the scene-clips bucket: {sessionId}/{sceneId}/frame/{frameId}.ext */
    startFrameStoragePath: string | null;
    startFrameUrl: string | null;
    stockFootageId: string | null;
    thumbnailUrl: string | null;
    needsCustomFootage: boolean;
    /** Key into the IndexedDB clip store; the blob never enters the draft. */
    uploadedClipId: string | null;
    uploadedClipName: string | null;
    /** Object path in the scene-clips bucket: {sessionId}/{sceneId}/{clipId}.ext */
    uploadedClipStoragePath: string | null;
    /** Public URL for the stored clip. Playback uses this after a refresh. */
    uploadedClipUrl: string | null;
    uploadedClipKind: "image" | "video" | null;
    /** Real source length, so trimming can't run past the end of the footage. */
    uploadedClipDurationSeconds: number | null;
  };
  editing: SceneEditing;
  status: SceneStatus;
}

export interface TitleOption {
  id: string;
  text: string;
  provider: AiProvider | "cursor" | "vidiq" | "manual";
  score?: TitleScore;
  /** Legacy local-draft field, normalized into score during hydration. */
  vidiq?: VidIqTitleInsight;
}

export type TitleScoreProvider = "vidiq" | "cursor";

export type TitleScore = {
  provider: TitleScoreProvider;
  score: number;
  rank: number;
};

export interface ThumbnailOption {
  id: string;
  concept: string;
  provider: AiProvider | "cursor" | "vidiq" | "manual";
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

export type VidIqThumbFinding = {
  message: string;
  tip?: string;
};

export type VidIqThumbInsight = {
  ctr: number;
  grade: VidIqGrade;
  contrast: number;
  textDensity: "Low" | "Medium" | "High";
  facePresent: boolean;
  notes: string;
  /** Real vidIQ thumbnail score, 0–100. Absent on older mock insights. */
  score?: number;
  strengths?: VidIqThumbFinding[];
  improvements?: VidIqThumbFinding[];
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

export type ScriptScoreProvider = "vidiq" | "cursor";

export type ScriptScore = VidIqScriptInsight & {
  provider: ScriptScoreProvider;
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
  provider: "static" | "cursor";
  sourceHash: string;
  score: number;
  verdict: LowEffortVerdict;
  summary?: string;
  findings: LowEffortFinding[];
};

export type ElevenLabsVoice = {
  voiceId: string;
  name: string;
};

export type QwenVoice = {
  voiceId: string;
  name: string;
};

export const DEFAULT_QWEN_VOICE: QwenVoice = {
  voiceId: "Ryan",
  name: "Ryan (English)",
};

const ELEVENLABS_VOICE_ID = /^[A-Za-z0-9_-]{8,64}$/;
const QWEN_VOICE_IDS = new Set([
  "Ryan",
  "Aiden",
  "Vivian",
  "Serena",
  "Uncle_Fu",
  "Dylan",
  "Eric",
  "Ono_Anna",
  "Sohee",
]);

export function normalizeElevenLabsVoice(raw: unknown): ElevenLabsVoice | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as { voiceId?: unknown; name?: unknown };
  if (typeof source.voiceId !== "string" || typeof source.name !== "string") return null;
  const voiceId = source.voiceId.trim();
  const name = source.name.trim();
  if (!ELEVENLABS_VOICE_ID.test(voiceId) || !name || name.length > 120) return null;
  return { voiceId, name };
}

export function normalizeQwenVoice(raw: unknown): QwenVoice | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as { voiceId?: unknown; name?: unknown };
  if (typeof source.voiceId !== "string" || typeof source.name !== "string") return null;
  const voiceId = source.voiceId.trim();
  const name = source.name.trim();
  if (!QWEN_VOICE_IDS.has(voiceId) || !name || name.length > 120) return null;
  return { voiceId, name };
}

export interface VideoProject {
  id: string;
  name: string;
  channelId: string;
  summary: VideoSummary;
  titles: TitleOption[];
  selectedTitleId: string | null;
  /** Exact Cursor prompt last used to generate the current title set. */
  cursorTitlePrompt: string | null;
  thumbnails: ThumbnailOption[];
  selectedThumbnailId: string | null;
  /** Exact Cursor prompt last used to generate the current thumbnail prompts. */
  cursorThumbnailPrompt: string | null;
  fullScript: string;
  /** Exact Cursor prompt last used to generate the current script. */
  cursorScriptPrompt: string | null;
  /** Exact Cursor prompt last used to generate the current description. */
  cursorDescriptionPrompt: string | null;
  scriptScore?: ScriptScore;
  /** Legacy local-draft field, normalized into scriptScore during hydration. */
  scriptVidiq?: VidIqScriptInsight;
  scenes: Scene[];
  /** ElevenLabs voice chosen for this session. Production voice. */
  elevenLabsVoice: ElevenLabsVoice | null;
  /** Qwen voice used by Listen on every scene. Demo voice. */
  qwenVoice: QwenVoice;
  /** Look applied to every generated scene prompt. Null keeps the faceless object film. */
  visualStyle: VisualStyleId | null;
  /** Style prompts saved on this video only. Missing styles use the shared library. */
  visualStylePrompts: VisualStylePromptMap;
  description: string;
  tags: string[];
  providerByStep: Partial<Record<StepId, AiProvider>>;
  stepStatus: Record<StepId, StepStatus>;
  apiCosts: ApiCostEntry[];
  renderedAt: string | null;
  /** Latest video.md brief. Null until Generate video.md is clicked. */
  videoMarkdown: string | null;
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

export const DEFAULT_STEP: StepId = "summary";

export function isStepId(value: unknown): value is StepId {
  return typeof value === "string" && STEPS.some((step) => step.id === value);
}

export const MAX_REFERENCES = 5;

export const FORMAT_LABELS: Record<VideoFormat, string> = {
  shorts: "Shorts",
  "long-form": "Long form",
};

export const INTENT_LABELS: Record<VideoIntent, string> = {
  educational: "Educational",
  entertainment: "Entertainment",
};

const DURATION_BOUNDS: Record<VideoFormat, { min: number; max: number; step: number }> = {
  shorts: { min: 15, max: 5 * 60, step: 15 },
  "long-form": { min: 5 * 60, max: Number.POSITIVE_INFINITY, step: 60 },
};

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

export function durationBoundsForFormat(format: VideoFormat): {
  min: number;
  max: number;
  step: number;
} {
  return DURATION_BOUNDS[format];
}

export function defaultDurationForFormat(format: VideoFormat): number {
  return format === "shorts" ? 30 : 5 * 60;
}

export function formatDurationLabel(seconds: number, format: VideoFormat): string {
  const total = Math.round(seconds);
  if (format === "shorts" && total < 60) return `${total} sec`;
  if (total >= 3600) {
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    if (minutes === 0) return `${hours} hr`;
    return `${hours} hr ${minutes} min`;
  }
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  if (remainder === 0) return `${minutes} min`;
  return `${minutes} min ${remainder} sec`;
}

export function snapDurationToPreset(format: VideoFormat, seconds: number): number {
  const { min, max, step } = durationBoundsForFormat(format);
  if (!Number.isFinite(seconds) || seconds <= 0) return defaultDurationForFormat(format);
  const clamped = Math.min(max, Math.max(min, seconds));
  const snapped = min + Math.round((clamped - min) / step) * step;
  return Math.min(max, Math.max(min, snapped));
}

export function stepDuration(format: VideoFormat, seconds: number, direction: -1 | 1): number {
  const { min, max, step } = durationBoundsForFormat(format);
  const current = snapDurationToPreset(format, seconds);
  return Math.min(max, Math.max(min, current + direction * step));
}

export function summaryLengthMinutes(summary: VideoSummary): number {
  return Math.max(summary.durationSeconds / 60, 1 / 60);
}

export function aspectClassName(aspect: AspectRatio): string {
  return aspect === "9:16" ? "aspect-[9/16]" : "aspect-video";
}

export function createEmptyReference(): ReferenceVideo {
  return {
    id: newId(),
    url: "",
    title: "",
    transcript: "",
    transcriptSource: null,
    fetchedUrl: null,
    lang: null,
    fetchedAt: null,
  };
}

export function emptySummary(): VideoSummary {
  return {
    topic: "",
    format: "long-form",
    aspectRatio: "16:9",
    intent: "educational",
    intentCategory: null,
    durationSeconds: defaultDurationForFormat("long-form"),
    references: [],
  };
}

export function applySummaryPatch(
  current: VideoSummary,
  patch: Partial<VideoSummary>,
): VideoSummary {
  const format = patch.format ?? current.format;
  const intent = patch.intent ?? current.intent;
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
    intent,
    intentCategory: normalizeIntentCategory(
      intent,
      patch.intentCategory !== undefined ? patch.intentCategory : current.intentCategory,
    ),
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
        title:
          typeof item.title === "string"
            ? item.title.trim().slice(0, MAX_REFERENCE_TITLE_CHARS)
            : "",
        transcript: typeof item.transcript === "string" ? item.transcript : "",
        transcriptSource:
          item.transcriptSource === "fetched" || item.transcriptSource === "manual"
            ? item.transcriptSource
            : typeof item.transcript === "string" && item.transcript.trim()
              ? "manual"
              : null,
        fetchedUrl: typeof item.fetchedUrl === "string" ? item.fetchedUrl : null,
        lang: typeof item.lang === "string" ? item.lang : null,
        fetchedAt: typeof item.fetchedAt === "string" ? item.fetchedAt : null,
      }));
  } else if (typeof source.sourceMaterial === "string" && source.sourceMaterial.trim()) {
    references = [{
      id: newId(),
      url: "",
      title: "",
      transcript: source.sourceMaterial,
      transcriptSource: "manual",
      fetchedUrl: null,
      lang: null,
      fetchedAt: null,
    }];
  }

  return {
    topic: typeof source.topic === "string" ? source.topic : "",
    format,
    aspectRatio: aspectForFormat(format),
    intent,
    intentCategory: normalizeIntentCategory(intent, source.intentCategory),
    durationSeconds: snapDurationToPreset(format, durationSeconds),
    references,
  };
}

export function normalizeTitles(raw: unknown): TitleOption[] {
  if (!Array.isArray(raw)) return [];

  const titles = raw.flatMap((value): TitleOption[] => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const item = value as Partial<TitleOption>;
    if (typeof item.id !== "string" || typeof item.text !== "string") return [];
    const provider =
      item.provider === "chatgpt" ||
      item.provider === "gemini" ||
      item.provider === "elevenlabs" ||
      item.provider === "cursor" ||
      item.provider === "vidiq" ||
      item.provider === "manual"
        ? item.provider
        : "chatgpt";
    const score =
      item.score &&
      (item.score.provider === "vidiq" || item.score.provider === "cursor") &&
      Number.isInteger(item.score.score) &&
      item.score.score >= 0 &&
      item.score.score <= 100 &&
      Number.isInteger(item.score.rank) &&
      item.score.rank > 0
        ? { ...item.score }
        : undefined;
    return [{ id: item.id, text: item.text, provider, score }];
  });

  const legacy = raw
    .map((value, index) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const item = value as Partial<TitleOption>;
      const score = item.vidiq?.score;
      return typeof score === "number" && Number.isFinite(score)
        ? { id: item.id, score: Math.max(0, Math.min(100, Math.round(score))), index }
        : null;
    })
    .filter((value): value is { id: string; score: number; index: number } => Boolean(value?.id))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const legacyById = new Map(
    legacy.map((item, index) => [
      item.id,
      { provider: "vidiq" as const, score: item.score, rank: index + 1 },
    ]),
  );

  return titles.map((title) =>
    title.score || !legacyById.has(title.id)
      ? title
      : { ...title, score: legacyById.get(title.id) },
  );
}

export function emptyEditing(): SceneEditing {
  return {
    notes: "",
    durationSeconds: null,
    scriptDurationSeconds: null,
    trimStartSeconds: 0,
    transitionIn: "none",
    transitionInSeconds: 0.5,
    transition: "none",
    transitionSeconds: 0.5,
    filter: "none",
    speed: 1,
    volume: 100,
    clipMuted: true,
    voiceSeconds: null,
    textOverlay: null,
  };
}

export function emptyEditorSettings(): EditorSettings {
  return {
    musicTrackId: null,
    musicVolume: 40,
    captions: false,
    captionFontId: null,
    captionFontWeight: DEFAULT_CAPTION_FONT_WEIGHT,
    captionFontSize: DEFAULT_CAPTION_FONT_SIZE,
    confirmedAt: null,
    exportedAt: null,
    exportCount: 0,
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
  const scriptDurationSeconds =
    typeof source.scriptDurationSeconds === "number" && source.scriptDurationSeconds > 0
      ? source.scriptDurationSeconds
      : null;
  const trimStartSeconds =
    typeof source.trimStartSeconds === "number" && source.trimStartSeconds > 0
      ? source.trimStartSeconds
      : base.trimStartSeconds;
  const speed =
    typeof source.speed === "number" && source.speed > 0
      ? Math.min(2, Math.max(0.5, source.speed))
      : base.speed;
  const volume =
    typeof source.volume === "number" && Number.isFinite(source.volume)
      ? Math.min(100, Math.max(0, source.volume))
      : base.volume;
  const transitionInSeconds =
    typeof source.transitionInSeconds === "number" && source.transitionInSeconds >= 0
      ? Math.min(2, source.transitionInSeconds)
      : base.transitionInSeconds;
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
    if (text.trim()) {
      const fontId = normalizeVideoFontId(source.textOverlay.fontId);
      textOverlay = {
        text,
        position,
        fontId,
        fontWeight: normalizeVideoFontWeight(
          fontId,
          source.textOverlay.fontWeight,
          DEFAULT_OVERLAY_FONT_WEIGHT,
        ),
        fontSize: clampFontSize(source.textOverlay.fontSize, DEFAULT_OVERLAY_FONT_SIZE),
      };
    }
  }
  return {
    notes: typeof source.notes === "string" ? source.notes : "",
    durationSeconds,
    scriptDurationSeconds,
    trimStartSeconds,
    transitionIn: isTransitionId(source.transitionIn) ? source.transitionIn : base.transitionIn,
    transitionInSeconds,
    transition: isTransitionId(source.transition) ? source.transition : base.transition,
    transitionSeconds,
    filter: isFilterId(source.filter) ? source.filter : base.filter,
    speed,
    volume,
    clipMuted: source.clipMuted === false ? false : true,
    voiceSeconds:
      typeof source.voiceSeconds === "number" && source.voiceSeconds > 0
        ? source.voiceSeconds
        : null,
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
    captionFontId: normalizeVideoFontId(source.captionFontId),
    captionFontWeight: normalizeVideoFontWeight(
      normalizeVideoFontId(source.captionFontId),
      source.captionFontWeight,
      DEFAULT_CAPTION_FONT_WEIGHT,
    ),
    captionFontSize: clampFontSize(source.captionFontSize, DEFAULT_CAPTION_FONT_SIZE),
    confirmedAt: typeof source.confirmedAt === "string" ? source.confirmedAt : null,
    exportedAt: typeof source.exportedAt === "string" ? source.exportedAt : null,
    exportCount:
      typeof source.exportCount === "number" && Number.isFinite(source.exportCount)
        ? Math.max(0, Math.floor(source.exportCount))
        : 0,
  };
}

const LOW_EFFORT_STEPS: LowEffortStep[] = ["script", "timeline", "render"];
const LOW_EFFORT_VERDICTS: LowEffortVerdict[] = ["pass", "warn", "fail"];

export function normalizeScriptScore(
  raw: unknown,
  fallbackProvider: ScriptScoreProvider = "vidiq",
): ScriptScore | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const source = raw as Partial<ScriptScore>;
  const metrics = [
    source.score,
    source.hook,
    source.retention,
    source.keywordFit,
    source.cta,
  ];
  if (
    metrics.some(
      (value) =>
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 100,
    ) ||
    (source.grade !== "A" &&
      source.grade !== "B" &&
      source.grade !== "C" &&
      source.grade !== "D") ||
    typeof source.sourceHash !== "string"
  ) {
    return undefined;
  }
  return {
    provider:
      source.provider === "cursor" || source.provider === "vidiq"
        ? source.provider
        : fallbackProvider,
    score: Math.round(source.score as number),
    grade: source.grade,
    hook: Math.round(source.hook as number),
    retention: Math.round(source.retention as number),
    keywordFit: Math.round(source.keywordFit as number),
    cta: Math.round(source.cta as number),
    wordCount:
      typeof source.wordCount === "number" && Number.isFinite(source.wordCount)
        ? Math.max(0, Math.round(source.wordCount))
        : 0,
    spokenMinutes:
      typeof source.spokenMinutes === "number" && Number.isFinite(source.spokenMinutes)
        ? Math.max(0, source.spokenMinutes)
        : 0,
    keywords: Array.isArray(source.keywords)
      ? source.keywords.filter((item): item is string => typeof item === "string").slice(0, 10)
      : [],
    notes: Array.isArray(source.notes)
      ? source.notes.filter((item): item is string => typeof item === "string").slice(0, 8)
      : [],
    sourceHash: source.sourceHash,
  };
}

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
    provider: source.provider === "cursor" ? "cursor" : "static",
    sourceHash: source.sourceHash,
    score: Math.min(100, Math.max(0, Math.round(source.score))),
    verdict: source.verdict,
    summary: typeof source.summary === "string" ? source.summary : undefined,
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
          clipSource: item.visuals?.clipSource === "still" ? "still" : "direct",
          imagePrompt: typeof item.visuals?.imagePrompt === "string" ? item.visuals.imagePrompt : "",
          startFrameId:
            typeof item.visuals?.startFrameId === "string" ? item.visuals.startFrameId : null,
          startFrameName:
            typeof item.visuals?.startFrameName === "string" ? item.visuals.startFrameName : null,
          startFrameStoragePath:
            typeof item.visuals?.startFrameStoragePath === "string"
              ? item.visuals.startFrameStoragePath
              : null,
          startFrameUrl:
            typeof item.visuals?.startFrameUrl === "string" ? item.visuals.startFrameUrl : null,
          stockFootageId: item.visuals?.stockFootageId ?? null,
          thumbnailUrl: item.visuals?.thumbnailUrl ?? null,
          needsCustomFootage: Boolean(item.visuals?.needsCustomFootage),
          uploadedClipId: item.visuals?.uploadedClipId ?? null,
          uploadedClipName: item.visuals?.uploadedClipName ?? null,
          uploadedClipStoragePath:
            typeof item.visuals?.uploadedClipStoragePath === "string"
              ? item.visuals.uploadedClipStoragePath
              : null,
          uploadedClipUrl:
            typeof item.visuals?.uploadedClipUrl === "string" ? item.visuals.uploadedClipUrl : null,
          uploadedClipKind:
            item.visuals?.uploadedClipKind === "video" ||
            item.visuals?.uploadedClipKind === "image"
              ? item.visuals.uploadedClipKind
              : null,
          uploadedClipDurationSeconds:
            typeof item.visuals?.uploadedClipDurationSeconds === "number" &&
            item.visuals.uploadedClipDurationSeconds > 0
              ? item.visuals.uploadedClipDurationSeconds
              : null,
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
    cursorTitlePrompt: null,
    thumbnails: [],
    selectedThumbnailId: null,
    cursorThumbnailPrompt: null,
    fullScript: "",
    cursorScriptPrompt: null,
    cursorDescriptionPrompt: null,
    scenes: [],
    elevenLabsVoice: null,
    qwenVoice: DEFAULT_QWEN_VOICE,
    visualStyle: null,
    visualStylePrompts: {},
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
    videoMarkdown: null,
    editor: emptyEditorSettings(),
    lowEffortByStep: emptyLowEffortByStep(),
    createdAt: now,
    lastUpdated: now,
  };
}

export function emptySceneVisuals(): Scene["visuals"] {
  return {
    description: "",
    clipSource: "direct",
    imagePrompt: "",
    startFrameId: null,
    startFrameName: null,
    startFrameStoragePath: null,
    startFrameUrl: null,
    stockFootageId: null,
    thumbnailUrl: null,
    needsCustomFootage: false,
    uploadedClipId: null,
    uploadedClipName: null,
    uploadedClipStoragePath: null,
    uploadedClipUrl: null,
    uploadedClipKind: null,
    uploadedClipDurationSeconds: null,
  };
}

/** The picture a neighboring scene should match. A still scene locks its opening frame. */
export function scenePicturePrompt(scene: Scene): string {
  if (scene.visuals.clipSource === "still") {
    return scene.visuals.imagePrompt.trim() || scene.visuals.description.trim();
  }
  return scene.visuals.description.trim();
}

export function applyGeneratedVisualPrompts(
  scenes: Scene[],
  prompts: Array<{ id: string; prompt: string; imagePrompt?: string }>,
  fields: "all" | "clip" | "image" = "all",
): Scene[] {
  const byId = new Map(
    prompts.flatMap((item) => {
      const prompt = item.prompt.trim();
      return prompt ? [[item.id, item] as const] : [];
    }),
  );
  return scenes.map((scene) => {
    const item = byId.get(scene.id);
    if (!item) return scene;
    const writeClip = fields !== "image";
    const nextImage =
      fields !== "clip" && scene.visuals.clipSource === "still" && item.imagePrompt?.trim()
        ? item.imagePrompt.trim()
        : null;
    if (!writeClip && !nextImage) return scene;
    return {
      ...scene,
      status: "generated",
      visuals: {
        ...scene.visuals,
        description: writeClip ? item.prompt.trim() : scene.visuals.description,
        imagePrompt: nextImage ?? scene.visuals.imagePrompt,
      },
    };
  });
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
    visuals: emptySceneVisuals(),
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
  const category = intentCategoryLabel(project.summary.intent, project.summary.intentCategory);
  const parts = [
    scene.originalPrompt,
    project.summary.topic ? `Video topic: ${project.summary.topic}` : "",
    `Format: ${FORMAT_LABELS[project.summary.format]} (${project.summary.aspectRatio})`,
    `Intent: ${INTENT_LABELS[project.summary.intent]}${category ? ` · ${category}` : ""}`,
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
    editor:
      project.scenes.length === 0
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
  return !name || name === DEFAULT_PROJECT_NAME;
}

export function resolveProjectName(project: VideoProject): string {
  const name = project.name.trim();
  if (name && name !== DEFAULT_PROJECT_NAME) return name;
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
  const locked = scene.editing.scriptDurationSeconds;
  if (locked && locked > 0) return locked;
  return scene.editing.durationSeconds && scene.editing.durationSeconds > 0
    ? scene.editing.durationSeconds
    : 15;
}

/**
 * Hard ceiling for `editing.durationSeconds`, in source seconds. Stills and
 * placeholder scenes have no footage to run out of, so they return null.
 */
/** Playable video for a scene: the stored clip, or a local blob URL from this browser. */
export function sceneClipMuted(scene: Scene): boolean {
  return scene.editing.clipMuted !== false;
}

export function sceneUploadedVideoUrl(
  scene: Scene,
  localUrls?: Record<string, string>,
): string | null {
  if (scene.visuals.uploadedClipKind !== "video") return null;
  if (scene.visuals.uploadedClipUrl) return scene.visuals.uploadedClipUrl;
  const id = scene.visuals.uploadedClipId;
  if (id && localUrls?.[id]) return localUrls[id];
  return null;
}

export function sceneSourceSeconds(scene: Scene): number | null {
  if (scene.visuals.uploadedClipKind !== "video") return null;
  const source = scene.visuals.uploadedClipDurationSeconds;
  return source && source > 0 ? source : null;
}

export function sceneRuntimeSeconds(scene: Scene): number {
  const voice = scene.editing.voiceSeconds;
  if (typeof voice === "number" && voice > 0) return voice;
  const speed = scene.editing.speed && scene.editing.speed > 0 ? scene.editing.speed : 1;
  return sceneDuration(scene) / speed;
}

/** Overlap between this clip and the next when using @remotion/transitions (seconds). */
export function joinTransitionRuntimeSeconds(scene: Scene): number {
  if (scene.editing.transition === "none") return 0;
  const frames = transitionSpanFrames(
    sceneRuntimeSeconds(scene),
    scene.editing.transitionSeconds,
    FACELESS_FPS,
  );
  return frames / FACELESS_FPS;
}

export function sceneTimelineStart(scenes: Scene[], index: number): number {
  let start = 0;
  for (let i = 0; i < index; i += 1) {
    const scene = scenes[i];
    if (!scene) continue;
    start += sceneRuntimeSeconds(scene);
    if (i < scenes.length - 1) start -= joinTransitionRuntimeSeconds(scene);
  }
  return Math.max(0, start);
}

export function sceneTimeRange(
  scenes: Scene[],
  index: number,
): { start: number; end: number; label: string } {
  const start = sceneTimelineStart(scenes, index);
  const nextIndex = index + 1;
  const end =
    nextIndex < scenes.length
      ? sceneTimelineStart(scenes, nextIndex)
      : totalTimelineSeconds(scenes);
  return { start, end, label: `${formatTimecode(start)}–${formatTimecode(end)}` };
}

export function totalTimelineSeconds(scenes: Scene[]): number {
  let total = 0;
  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index];
    if (!scene) continue;
    total += sceneRuntimeSeconds(scene);
    if (index < scenes.length - 1) total -= joinTransitionRuntimeSeconds(scene);
  }
  return Math.max(0, total);
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
  agent: "Agent",
};

export function apiFiresByStep(
  project: VideoProject,
  stepIds: readonly StepId[],
): Array<{ id: StepId; label: string; calls: number }> {
  const counts = new Map<StepId, number>();
  for (const entry of project.apiCosts ?? []) {
    counts.set(entry.step, (counts.get(entry.step) ?? 0) + 1);
  }
  return stepIds.map((id) => ({
    id,
    label: STEPS.find((step) => step.id === id)?.label ?? id,
    calls: counts.get(id) ?? 0,
  }));
}

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
