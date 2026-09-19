import type { StepId, StepStatus } from "@/lib/videoProject";

export type SummaryStepData = {
  channelId: string | null;
  channelTitle: string | null;
  format: string;
  aspectRatio: string;
  intent: string;
  targetDurationSec: number;
  topic: string;
  referenceCount: number;
  referencesWithTranscript: number;
  referencesFetched: number;
};

export type TitleStepData = {
  generatedCount: number;
  selectedTitleId: string | null;
  selectedTitle: string | null;
  editedCount: number;
  scores: Array<{
    titleId: string;
    provider: "vidiq" | "cursor";
    score: number;
    rank: number;
  }>;
};

export type ThumbnailStepData = {
  conceptCount: number;
  customUploadCount: number;
  selectedThumbnailId: string | null;
  selectedConcept: string | null;
  vidiq: Record<string, unknown> | null;
};

export type ScriptStepData = {
  wordCount: number;
  charCount: number;
  manualEditCount: number;
  score: Record<string, unknown> | null;
};

export type TimelineStepData = {
  sceneCount: number;
  totalSeconds: number;
  targetSeconds: number;
  scenesWithClip: number;
  scenesWithVoiceover: number;
  manualClipCount: number;
  splitCount: number;
  deleteCount: number;
  viewMode: string | null;
};

export type DescriptionStepData = {
  charCount: number;
  tagCount: number;
  hashtagCount: number;
};

export type RenderStepData = {
  readinessComplete: number;
  readinessTotal: number;
  renderedAt: string | null;
  lowEffortVerdict: string | null;
};

export type EditorStepData = {
  musicTrackId: string | null;
  musicVolume: number;
  captions: boolean;
  transitionsUsed: string[];
  filtersUsed: string[];
  overlayCount: number;
  confirmedAt: string | null;
  exportCount: number;
};

export type StepDataById = {
  summary: SummaryStepData;
  title: TitleStepData;
  thumbnail: ThumbnailStepData;
  script: ScriptStepData;
  timeline: TimelineStepData;
  description: DescriptionStepData;
  render: RenderStepData;
  editor: EditorStepData;
};

export type SessionStepSnapshot<T extends StepId = StepId> = {
  step: T;
  state: StepStatus;
  provider: string | null;
  data: StepDataById[T];
  apiCallCount: number;
  generationCount: number;
};
