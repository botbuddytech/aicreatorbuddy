import type {
  AgentContextPayload,
  ChangePayload,
  FlashField,
  ProjectChange,
  ToolName,
} from "@/lib/agent/types";
import type { ScriptScore, StepId } from "@/lib/videoProject";
import { parseYoutubeVideoId } from "@/lib/youtube/transcript";
import { formatDurationLabel, snapDurationToPreset } from "@/lib/videoProject";

const STEPS = new Set<StepId>([
  "summary",
  "title",
  "thumbnail",
  "script",
  "timeline",
  "description",
  "render",
  "editor",
]);

const TOOL_NAMES = new Set<ToolName>([
  "setBrief",
  "generateTitles",
  "scoreTitles",
  "applyTitle",
  "generateScript",
  "scoreScript",
  "editScript",
  "generateThumbnailPrompt",
  "generateVisualPrompts",
  "updateTimeline",
  "writeDescription",
  "navigateToStep",
  "markStepApproved",
  "setProjectName",
  "addReference",
  "fetchReferenceTranscript",
  "setApproxLength",
]);

const LABELS: Record<ToolName, string> = {
  setBrief: "Update brief",
  generateTitles: "Suggest titles",
  scoreTitles: "Score titles",
  applyTitle: "Set title",
  generateScript: "Write script",
  scoreScript: "Score script",
  editScript: "Edit script",
  generateThumbnailPrompt: "Thumbnail concept",
  generateVisualPrompts: "Visual prompts",
  updateTimeline: "Update timeline",
  writeDescription: "Write description",
  navigateToStep: "Go to step",
  markStepApproved: "Approve step",
  setProjectName: "Rename project",
  addReference: "Add reference",
  fetchReferenceTranscript: "Fetch transcript",
  setApproxLength: "Approx length",
};

export function unwrapMcpTool(name: string, args: unknown): { name: string; args: unknown } {
  if (args && typeof args === "object" && "toolName" in args) {
    const record = args as { toolName?: unknown; args?: unknown };
    if (typeof record.toolName === "string") return { name: record.toolName, args: record.args ?? {} };
  }
  return { name, args };
}

export function knownToolName(name: string): ToolName | null {
  const tail = name.split(/[/:]/).pop() ?? name;
  if (TOOL_NAMES.has(tail as ToolName)) return tail as ToolName;
  if (TOOL_NAMES.has(name as ToolName)) return name as ToolName;
  return null;
}

export function assistantDelta(sent: string, incoming: string): { sent: string; delta: string } {
  if (!incoming) return { sent, delta: "" };
  if (incoming.startsWith(sent)) return { sent: incoming, delta: incoming.slice(sent.length) };
  return { sent: sent + incoming, delta: incoming };
}

function text(value: unknown, limit: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > limit ? trimmed.slice(0, limit) : trimmed;
}

function stringList(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  const items: string[] = [];
  for (const item of value) {
    const line = text(item, 300);
    if (!line) continue;
    items.push(line);
    if (items.length >= limit) break;
  }
  return items;
}

function titleProvider(value: unknown): "cursor" | "chatgpt" | "gemini" | "vidiq" | "manual" {
  if (value === "chatgpt" || value === "gemini" || value === "vidiq" || value === "manual" || value === "cursor") {
    return value;
  }
  return "cursor";
}

function stepId(value: unknown): StepId | null {
  return typeof value === "string" && STEPS.has(value as StepId) ? (value as StepId) : null;
}

function payloadFor(tool: ToolName, args: unknown): ChangePayload | null {
  const record = args && typeof args === "object" ? (args as Record<string, unknown>) : {};
  switch (tool) {
    case "setBrief": {
      const topic = text(record.topic, 4000);
      return topic ? { type: "brief", topic } : null;
    }
    case "generateTitles": {
      const titles = stringList(record.titles, 12);
      if (titles.length === 0) return null;
      const provider = titleProvider(record.provider);
      const cursorPrompt = typeof record.cursorPrompt === "string" ? record.cursorPrompt : null;
      return { type: "titles", titles, provider, cursorPrompt };
    }
    case "applyTitle": {
      const title = text(record.title, 300);
      return title ? { type: "titles", titles: [title], provider: "manual", cursorPrompt: null } : null;
    }
    case "generateScript":
    case "editScript": {
      const script = text(record.script, 100_000);
      if (!script) return null;
      const cursorPrompt = typeof record.cursorPrompt === "string" ? record.cursorPrompt : null;
      return {
        type: "script",
        script,
        cursorPrompt,
        generated: record.generated === true,
      };
    }
    case "scoreTitles": {
      if (!Array.isArray(record.scores)) return null;
      const scores = record.scores.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        const id = text(row.id, 80);
        const score = typeof row.score === "number" ? Math.round(row.score) : Number.NaN;
        const rank = typeof row.rank === "number" ? Math.round(row.rank) : Number.NaN;
        if (!id || !Number.isFinite(score) || !Number.isFinite(rank)) return [];
        return [{ id, score, rank }];
      });
      return scores.length > 0 ? { type: "titleScores", scores } : null;
    }
    case "scoreScript": {
      if (!record.score || typeof record.score !== "object") return null;
      return { type: "scriptScore", score: record.score as ScriptScore };
    }
    case "generateThumbnailPrompt": {
      const concepts = stringList(record.concepts, 8);
      if (concepts.length === 0) return null;
      const cursorPrompt = typeof record.cursorPrompt === "string" ? record.cursorPrompt : null;
      return { type: "thumbnailPrompts", concepts, cursorPrompt };
    }
    case "generateVisualPrompts": {
      if (!Array.isArray(record.prompts)) return null;
      const prompts = record.prompts.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        const id = text(row.id, 80);
        const prompt = text(row.prompt, 6000);
        if (!id || !prompt) return [];
        return [{ id, prompt }];
      });
      return prompts.length > 0 ? { type: "visualPrompts", prompts } : null;
    }
    case "updateTimeline": {
      if (!Array.isArray(record.scenes)) return null;
      const scenes = record.scenes
        .slice(0, 40)
        .map((scene) => {
          if (!scene || typeof scene !== "object") return null;
          const item = scene as Record<string, unknown>;
          const sectionLabel = text(item.sectionLabel, 120);
          const finalScript = text(item.finalScript, 8000);
          if (!sectionLabel || !finalScript) return null;
          return { sectionLabel, finalScript };
        })
        .filter((scene): scene is { sectionLabel: string; finalScript: string } => !!scene);
      return scenes.length > 0 ? { type: "timeline", scenes } : null;
    }
    case "writeDescription": {
      const description = text(record.description, 8000);
      const tags = stringList(record.tags, 30);
      return description ? { type: "description", description, tags } : null;
    }
    case "navigateToStep": {
      const step = stepId(record.step);
      return step ? { type: "navigate", step } : null;
    }
    case "markStepApproved": {
      const step = stepId(record.step);
      return step ? { type: "approve", step } : null;
    }
    case "setProjectName": {
      const name = text(record.name, 120);
      return name ? { type: "name", name } : null;
    }
    case "addReference": {
      const url = text(record.url, 2048);
      if (!url || !parseYoutubeVideoId(url)) return null;
      return { type: "addReference", url };
    }
    case "fetchReferenceTranscript": {
      const url = text(record.url, 2048);
      const transcript = text(record.transcript, 200_000);
      if (!url || !parseYoutubeVideoId(url) || !transcript) return null;
      const title = text(record.title, 200);
      const lang = text(record.lang, 20) || null;
      const fetchedAt = text(record.fetchedAt, 40) || new Date().toISOString();
      return { type: "referenceTranscript", url, title, transcript, lang, fetchedAt };
    }
    case "setApproxLength": {
      const raw = typeof record.seconds === "number" ? record.seconds : Number(record.seconds);
      if (!Number.isFinite(raw) || raw <= 0) return null;
      return { type: "duration", durationSeconds: raw };
    }
    default: {
      const exhaustive: never = tool;
      return exhaustive;
    }
  }
}

function fieldFor(payload: ChangePayload): FlashField | "step" | "name" {
  switch (payload.type) {
    case "brief":
      return "brief";
    case "titles":
      return "title";
    case "titleScores":
      return "title";
    case "script":
    case "scriptScore":
      return "script";
    case "thumbnail":
    case "thumbnailPrompts":
      return "thumbnail";
    case "timeline":
    case "visualPrompts":
      return "timeline";
    case "description":
      return "description";
    case "navigate":
    case "approve":
      return "step";
    case "name":
      return "name";
    case "addReference":
    case "referenceTranscript":
    case "duration":
      return "brief";
    default: {
      const exhaustive: never = payload;
      return exhaustive;
    }
  }
}

function afterText(payload: ChangePayload): string {
  switch (payload.type) {
    case "brief":
      return payload.topic;
    case "titles":
      return payload.titles.join("\n");
    case "titleScores":
      return payload.scores.map((item) => `${item.rank}. ${item.score}`).join("\n");
    case "script":
      return payload.script;
    case "scriptScore":
      return `${payload.score.grade} ${payload.score.score}`;
    case "thumbnail":
      return payload.concept;
    case "thumbnailPrompts":
      return payload.concepts.join("\n\n");
    case "timeline":
      return payload.scenes.map((scene) => `${scene.sectionLabel}: ${scene.finalScript}`).join("\n");
    case "visualPrompts":
      return payload.prompts.map((item) => item.prompt).join("\n\n");
    case "description":
      return [payload.description, payload.tags.join(", ")].filter(Boolean).join("\n");
    case "navigate":
      return payload.step;
    case "approve":
      return payload.step;
    case "name":
      return payload.name;
    case "addReference":
      return payload.url;
    case "referenceTranscript": {
      const words = payload.transcript.trim() ? payload.transcript.trim().split(/\s+/).length : 0;
      return `${payload.title || payload.url}\n${words} words of transcript`;
    }
    case "duration":
      return formatDurationLabel(payload.durationSeconds, "long-form");
    default: {
      const exhaustive: never = payload;
      return exhaustive;
    }
  }
}

function beforeText(field: FlashField | "step" | "name", context: AgentContextPayload): string {
  switch (field) {
    case "brief":
      return context.brief;
    case "title":
      return context.title;
    case "script":
      return context.script;
    case "thumbnail":
      return context.thumbnail;
    case "timeline":
      return context.timeline;
    case "description":
      return context.description;
    case "step":
      return context.step;
    case "name":
      return context.projectName;
    default: {
      const exhaustive: never = field;
      return exhaustive;
    }
  }
}

export function projectChangeFromTool(
  name: string,
  args: unknown,
  context: AgentContextPayload,
  id: string,
): ProjectChange | null {
  const tool = knownToolName(name);
  if (!tool || !id) return null;
  const built = payloadFor(tool, args);
  if (!built) return null;
  const payload =
    built.type === "duration"
      ? { type: "duration" as const, durationSeconds: snapDurationToPreset(context.format, built.durationSeconds) }
      : built;
  const field = fieldFor(payload);
  const after =
    payload.type === "duration"
      ? formatDurationLabel(payload.durationSeconds, context.format)
      : afterText(payload);
  const before =
    payload.type === "duration"
      ? formatDurationLabel(context.durationSeconds, context.format)
      : (referenceBefore(payload, context) ?? beforeText(field, context));
  return {
    id,
    tool,
    field,
    label: LABELS[tool],
    summary: LABELS[tool],
    before,
    after,
    status: "pending",
    payload,
  };
}

function referenceBefore(payload: ChangePayload, context: AgentContextPayload): string | null {
  if (payload.type === "addReference") {
    const urls = context.references.map((item) => item.url).filter(Boolean);
    return urls.length > 0 ? urls.join("\n") : "No reference videos";
  }
  if (payload.type === "referenceTranscript") {
    const match = context.references.find((item) => item.url.trim() === payload.url.trim());
    return match?.hasTranscript ? "Transcript already saved" : "No transcript";
  }
  return null;
}

export function toolLabel(name: string): string {
  const tool = knownToolName(name);
  return tool ? LABELS[tool] : name;
}
