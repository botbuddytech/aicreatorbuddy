import type {
  Scene,
  StepId,
  StepStatus,
  ThumbnailOption,
  TitleOption,
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
  | "applyTitle"
  | "generateScript"
  | "editScript"
  | "generateThumbnailPrompt"
  | "updateTimeline"
  | "writeDescription"
  | "navigateToStep"
  | "markStepApproved";

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
  | { type: "titles"; titles: string[] }
  | { type: "script"; script: string }
  | { type: "thumbnail"; concept: string }
  | { type: "timeline"; scenes: { sectionLabel: string; finalScript: string }[] }
  | { type: "description"; description: string; tags: string[] }
  | { type: "navigate"; step: StepId }
  | { type: "approve"; step: StepId };

export type ProjectChange = {
  id: string;
  tool: ToolName;
  field: FlashField | "step";
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
};

export type StreamEvent =
  | { event: "token"; text: string }
  | { event: "tool"; tool: ToolCallState }
  | { event: "change"; change: ProjectChange }
  | { event: "cost"; cost: RunCost }
  | { event: "error"; message: string }
  | { event: "done" };
