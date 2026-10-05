import "server-only";

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { formatDurationLabel } from "@/lib/videoProject";
import {
  Agent,
  AgentNotFoundError,
  AuthenticationError,
  Cursor,
  CursorAgentError,
  RateLimitError,
  UnknownAgentError,
  type ModelSelection,
  type SDKAgent,
  type SDKMessage,
} from "@cursor/sdk";
import type { AgentContextPayload, AgentMode, MentionId, ProjectChange, ToolCallState } from "@/lib/agent/types";
import { assistantDelta, knownToolName, projectChangeFromTool, toolLabel, unwrapMcpTool } from "@/features/cursor-sdk-agent/server/changes";
import { createProjectTools } from "@/features/cursor-sdk-agent/server/tools";

export class LocalAgentConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalAgentConfigError";
  }
}

type HistoryTurn = { role: "user" | "assistant"; content: string };

export type LocalChatRequest = {
  threadId: string;
  sdkAgentId?: string;
  reset?: boolean;
  mode: AgentMode;
  message: string;
  context: AgentContextPayload;
  mentions: MentionId[];
  dismissed: string[];
  history: HistoryTurn[];
  signal: AbortSignal;
  userId: string;
  onEvent: (event: string, data: unknown) => void;
};

type Held = {
  agent: SDKAgent;
  mode: AgentMode;
  proposals: Map<string, ProjectChange>;
  context: AgentContextPayload;
  userId: string;
};

const pool = new Map<string, Held>();
let cachedModel: ModelSelection | null = null;

function apiKey(): string {
  const key = process.env.CURSOR_API_KEY?.trim() ?? "";
  if (!key) {
    throw new LocalAgentConfigError("Set CURSOR_API_KEY in .env and restart the dev server.");
  }
  return key;
}

function workspaceFor(threadId: string): string {
  return join(process.cwd(), "data", "cursor-sdk-agents", threadId);
}

async function resolveModel(key: string): Promise<ModelSelection> {
  if (cachedModel) return cachedModel;
  try {
    const models = await Cursor.models.list({ apiKey: key });
    const composer =
      models.find((model) => model.id === "composer-2.5") ??
      models.find((model) => model.id.startsWith("composer"));
    cachedModel = { id: composer?.id ?? models[0]?.id ?? "auto" };
  } catch {
    return { id: "auto" };
  }
  return cachedModel;
}

function clip(value: string, limit: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit)}…`;
}

function promptFor(request: LocalChatRequest): string {
  const context = request.context;
  const skipped = new Set(request.dismissed);
  const mentions = request.mentions.length > 0 ? request.mentions.join(", ") : "none";
  const history = request.history
    .slice(-12)
    .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${clip(turn.content, 2000)}`)
    .join("\n\n");
  const lines = [
    "You help create one YouTube video inside AI Creator Buddy.",
    "When the user wants a change, call a project tool. For every generation or score that can use Cursor or another provider, always use Cursor. Do not invent titles, scores, scripts, thumbnail prompts, or visual prompts. Pass provider only when the user explicitly names chatgpt, gemini, or vidiq. Use setProjectName for the workspace name, not the YouTube title. Call generateTitles to generate titles. Call scoreTitles to score titles. Call scoreScript to score a script. Call generateScript, generateThumbnailPrompt, and generateVisualPrompts for those steps. Call addReference once per YouTube link. Call fetchReferenceTranscript once per reference video that has no transcript. Use setApproxLength to change the approximate length, passing seconds. Do not edit files or run commands.",
    "",
  ];
  if (!skipped.has("channel")) lines.push(`Channel: ${clip(context.channel, 200) || "unknown"}`);
  lines.push(`Project name: ${clip(context.projectName, 120) || "Untitled video"}`);
  lines.push(`Approx length: ${formatDurationLabel(context.durationSeconds, context.format)} (${context.format})`);
  lines.push(
    `Reference videos: ${
      context.references.length
        ? context.references
            .map(
              (reference, index) =>
                `${index + 1}. ${reference.url} | ${reference.title || "untitled"} | ${reference.hasTranscript ? "transcript ready" : "no transcript"}`,
            )
            .join(" ; ")
        : "none"
    }`,
  );
  if (!skipped.has("step")) lines.push(`Step: ${context.step}`);
  if (!skipped.has("brief")) lines.push(`Brief: ${clip(context.brief, 4000) || "empty"}`);
  lines.push(
    `Titles: ${clip(context.title, 2000) || "empty"}`,
    `Script: ${clip(context.script, 8000) || "empty"}`,
    `Description: ${clip(context.description, 2000) || "empty"}`,
    `Thumbnail: ${clip(context.thumbnail, 2000) || "empty"}`,
    `Timeline: ${clip(context.timeline, 4000) || "empty"}`,
    `Mentions: ${mentions}`,
  );
  if (history) lines.push("", "Earlier in this chat:", history);
  lines.push("", `User: ${request.message}`);
  return lines.filter((line) => line !== "").join("\n");
}

async function dispose(held: Held) {
  await held.agent[Symbol.asyncDispose]().catch(() => undefined);
}

function isMissingAgent(error: unknown): boolean {
  return error instanceof AgentNotFoundError || error instanceof UnknownAgentError;
}

async function acquire(request: LocalChatRequest, key: string, model: ModelSelection): Promise<Held> {
  const cwd = workspaceFor(request.threadId);
  await mkdir(cwd, { recursive: true });
  const existing = pool.get(request.threadId);
  if (request.reset && existing) {
    await dispose(existing);
    pool.delete(request.threadId);
  } else if (existing && existing.mode === request.mode) {
    existing.context = request.context;
    return existing;
  } else if (existing) {
    await dispose(existing);
    pool.delete(request.threadId);
  }

  const held: Held = {
    agent: undefined as unknown as SDKAgent,
    mode: request.mode,
    proposals: new Map(),
    context: request.context,
    userId: request.userId,
  };
  const local = {
    cwd,
    settingSources: [] as [],
    customTools: request.mode === "agent" ? createProjectTools(held) : undefined,
  };
  const options = {
    apiKey: key,
    model,
    tools: request.mode === "ask" ? ([] as []) : (["mcp"] as ["mcp"]),
    local,
  };
  const resumeId = request.reset ? undefined : request.sdkAgentId;
  if (resumeId) {
    try {
      held.agent = await Agent.resume(resumeId, options);
    } catch (error) {
      if (!isMissingAgent(error)) throw error;
      held.agent = await Agent.create({ ...options, name: "Video chat" });
    }
  } else {
    held.agent = await Agent.create({ ...options, name: "Video chat" });
  }
  pool.set(request.threadId, held);
  return held;
}

function toolState(event: Extract<SDKMessage, { type: "tool_call" }>): ToolCallState | null {
  const call = unwrapMcpTool(event.name, event.args);
  const tool = knownToolName(call.name);
  if (!tool) return null;
  const args = call.args && typeof call.args === "object" ? (call.args as Record<string, unknown>) : {};
  return {
    id: event.call_id,
    name: tool,
    label: toolLabel(tool),
    summary: event.status === "error" ? "Failed" : event.status === "completed" ? "Ready to review" : "Working",
    status: event.status === "completed" ? "done" : event.status === "error" ? "error" : "running",
    args,
  };
}

export function localAgentErrorMessage(error: unknown): string {
  if (error instanceof LocalAgentConfigError) return error.message;
  if (error instanceof AuthenticationError) return "Cursor rejected CURSOR_API_KEY. Check the key in .env.";
  if (error instanceof RateLimitError) return error.message || "Cursor usage limit reached.";
  if (error instanceof CursorAgentError) return error.message || "Cursor Agent could not answer.";
  if (error instanceof Error && error.message) return error.message;
  return "Cursor Agent could not answer.";
}

export async function streamLocalChat(request: LocalChatRequest): Promise<void> {
  const key = apiKey();
  const model = await resolveModel(key);
  const held = await acquire(request, key, model);
  held.proposals = new Map();
  held.context = request.context;
  held.userId = request.userId;
  request.onEvent("session", { sdkAgentId: held.agent.agentId });
  request.onEvent("thinking", { model: held.agent.model?.id ?? model.id });

  const run = await held.agent.send(promptFor(request), {
    mode: "agent",
    ...(request.mode === "agent" ? { local: { customTools: createProjectTools(held) } } : {}),
  });

  const cancel = () => {
    void run.cancel().catch(() => undefined);
  };
  if (request.signal.aborted) {
    cancel();
    await run.wait().catch(() => undefined);
    return;
  }
  request.signal.addEventListener("abort", cancel);

  let sent = "";
  const emittedChanges = new Set<string>();
  try {
    for await (const event of run.stream()) {
      if (request.signal.aborted) break;
      if (event.type === "assistant") {
        const incoming = event.message.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("");
        const next = assistantDelta(sent, incoming);
        sent = next.sent;
        if (next.delta) request.onEvent("token", { text: next.delta });
        continue;
      }
      if (event.type !== "tool_call" || request.mode !== "agent") continue;
      const tool = toolState(event);
      if (tool) request.onEvent("tool", { tool });
      if (event.status !== "completed" || emittedChanges.has(event.call_id)) continue;
      const call = unwrapMcpTool(event.name, event.args);
      const change =
        held.proposals.get(event.call_id) ??
        projectChangeFromTool(call.name, call.args, request.context, event.call_id);
      if (!change) continue;
      emittedChanges.add(event.call_id);
      request.onEvent("change", { change });
    }

    const result = await run.wait();
    if (request.signal.aborted || result.status === "cancelled") return;
    if (result.status === "error") {
      throw new CursorAgentError(result.error?.message || "Cursor Agent could not answer.");
    }
    const modelId = result.model?.id ?? held.agent.model?.id ?? model.id;
    const tokens = result.usage?.totalTokens ?? 0;
    if (tokens > 0) {
      request.onEvent("cost", { cost: { tokens, usd: 0, model: modelId } });
    }
  } finally {
    request.signal.removeEventListener("abort", cancel);
  }
}
