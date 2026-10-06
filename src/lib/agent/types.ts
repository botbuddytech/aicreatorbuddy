import type {
  LowEffortFinding,
  LowEffortVerdict,
  Scene,
  ScriptScore,
  StepId,
  StepStatus,
  ThumbnailOption,
  VidIqThumbInsight,
  TitleOption,
  VideoFormat,
  VideoSummary,
} from "@/lib/videoProject";

export type AgentMode = "agent" | "ask";

export const CURSOR_CLI_MODEL_ID = "cursor-cli";

const LEGACY_MODEL_IDS = new Set(["cursor-cli", "mock-fast", "mock-smart"]);

export function agentModelLabel(id: string): string {
  if (!id || LEGACY_MODEL_IDS.has(id)) return "Cursor CLI";
  return id;
}

export type ToolName =
  | "setBrief"
  | "generateTitles"
  | "scoreTitles"
  | "applyTitle"
  | "generateScript"
  | "scoreScript"
  | "checkScriptLowEffort"
  | "editScript"
  | "generateThumbnailPrompt"
  | "generateThumbnailImages"
  | "scoreThumbnails"
  | "generateVisualPrompts"
  | "updateTimeline"
  | "writeDescription"
  | "navigateToStep"
  | "markStepApproved"
  | "setProjectName"
  | "addReference"
  | "fetchReferenceTranscript"
  | "setApproxLength";

export type MentionId = "title" | "script" | "thumbnail" | "brief" | "timeline";

export const MENTIONS: { id: MentionId; label: string }[] = [
  { id: "title", label: "Title" },
  { id: "script", label: "Script" },
  { id: "thumbnail", label: "Thumbnail" },
  { id: "brief", label: "Brief" },
  { id: "timeline", label: "Timeline" },
];

export type FlashField =
  | "brief"
  | "title"
  | "script"
  | "thumbnail"
  | "timeline"
  | "description";

export type ToolCallState = {
  id: string;
  name: ToolName;
  label: string;
  summary: string;
  status: "running" | "done" | "error";
  args: Record<string, unknown>;
  result?: unknown;
};

export type ChangePayload =
  | { type: "brief"; topic: string }
  | { type: "titles"; titles: string[]; provider: "cursor" | "chatgpt" | "gemini" | "vidiq" | "manual"; cursorPrompt?: string | null }
  | { type: "titleScores"; scores: { id: string; score: number; rank: number }[] }
  | { type: "script"; script: string; cursorPrompt?: string | null; generated?: boolean }
  | { type: "scriptScore"; score: ScriptScore }
  | {
      type: "scriptLowEffort";
      summary: string;
      score: number;
      verdict: LowEffortVerdict;
      findings: LowEffortFinding[];
    }
  | { type: "thumbnailPrompts"; concepts: string[]; cursorPrompt: string | null }
  | { type: "thumbnailImages"; images: { id: string; url: string }[] }
  | { type: "thumbnailScores"; insights: Record<string, VidIqThumbInsight> }
  | { type: "visualPrompts"; prompts: { id: string; prompt: string; imagePrompt?: string }[] }
  | { type: "thumbnail"; concept: string }
  | { type: "timeline"; scenes: { sectionLabel: string; finalScript: string }[] }
  | { type: "description"; description: string; tags: string[] }
  | { type: "navigate"; step: StepId }
  | { type: "approve"; step: StepId }
  | { type: "name"; name: string }
  | { type: "addReference"; url: string }
  | {
      type: "referenceTranscript";
      url: string;
      title: string;
      transcript: string;
      lang: string | null;
      fetchedAt: string;
    }
  | { type: "duration"; durationSeconds: number };

export type ProjectChange = {
  id: string;
  tool: ToolName;
  field: FlashField | "step" | "name";
  label: string;
  summary: string;
  before: string;
  after: string;
  status: "pending" | "accepted" | "rejected";
  payload: ChangePayload;
};

export type RunCost = {
  tokens: number;
  usd: number;
  model: string;
};

export type AgentMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  toolCalls?: ToolCallState[];
  changes?: ProjectChange[];
  cost?: RunCost;
  /** Set once the estimate has been added to the project cost card. */
  costPosted?: boolean;
  checkpointId?: string;
  error?: string;
};

export type ProjectSnapshot = {
  summary: VideoSummary;
  titles: TitleOption[];
  selectedTitleId: string | null;
  thumbnails: ThumbnailOption[];
  selectedThumbnailId: string | null;
  fullScript: string;
  scenes: Scene[];
  description: string;
  tags: string[];
  stepStatus: Record<StepId, StepStatus>;
  activeStep: StepId;
  name?: string;
};

export type AgentCheckpoint = {
  id: string;
  messageId: string;
  label: string;
  createdAt: string;
  snapshot: ProjectSnapshot;
};

export type AgentThread = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AgentMessage[];
  checkpoints: AgentCheckpoint[];
  dismissedChips: string[];
  mentions: MentionId[];
  /** Local Cursor SDK agent id for this thread. Absent until the first reply starts. */
  sdkAgentId?: string;
};

export type AgentContextPayload = {
  brief: string;
  title: string;
  script: string;
  description: string;
  thumbnail: string;
  timeline: string;
  channel: string;
  step: StepId;
  projectName: string;
  format: VideoFormat;
  durationSeconds: number;
  intent: "educational" | "entertainment";
  projectId: string;
  selectedTitle: string;
  titleOptions: { id: string; text: string }[];
  thumbnails: { id: string; concept: string; imageUrl?: string }[];
  scenes: {
    id: string;
    section: string;
    script: string;
    durationSeconds: number;
    order: number;
    existingPrompt: string;
    clipSource: "direct" | "still";
  }[];
  references: { url: string; title: string; transcript: string; hasTranscript: boolean }[];
  /** Selected visual style. Null keeps the faceless object film. */
  visualStyle: string | null;
  /** This video's saved copy of the selected style prompt. Empty means use the library. */
  visualStylePrompt: string;
};

export type StreamEvent =
  | { event: "token"; text: string }
  | { event: "tool"; tool: ToolCallState }
  | { event: "change"; change: ProjectChange }
  | { event: "cost"; cost: RunCost }
  | { event: "error"; message: string }
  | { event: "done" };
