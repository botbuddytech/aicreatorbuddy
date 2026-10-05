import { localAgentErrorMessage, streamLocalChat } from "@/features/cursor-sdk-agent/server/pool";
import type { AgentContextPayload, AgentMode, MentionId } from "@/lib/agent/types";
import { MENTIONS } from "@/lib/agent/types";
import { requireUser } from "@/lib/auth/session";
import type { StepId } from "@/lib/videoProject";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = { "cache-control": "no-store" };
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
const MENTION_IDS = new Set<MentionId>(MENTIONS.map((item) => item.id));

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: NO_STORE_HEADERS });
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function text(value: unknown, limit: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > limit ? trimmed.slice(0, limit) : trimmed;
}

function contextFrom(value: unknown): AgentContextPayload {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const step = typeof source.step === "string" && STEPS.has(source.step as StepId) ? (source.step as StepId) : "summary";
  return {
    brief: text(source.brief, 20_000),
    title: text(source.title, 8000),
    script: text(source.script, 100_000),
    description: text(source.description, 20_000),
    thumbnail: text(source.thumbnail, 8000),
    timeline: text(source.timeline, 40_000),
    channel: text(source.channel, 200),
    step,
    projectName: text(source.projectName, 120),
    format: source.format === "shorts" ? "shorts" : "long-form",
    durationSeconds:
      typeof source.durationSeconds === "number" && Number.isFinite(source.durationSeconds)
        ? source.durationSeconds
        : 300,
    intent: source.intent === "entertainment" ? "entertainment" : "educational",
    projectId: text(source.projectId, 80),
    selectedTitle: text(source.selectedTitle, 500),
    titleOptions: titleOptionsFrom(source.titleOptions),
    scenes: scenesFrom(source.scenes),
    references: referenceList(source.references),
  };
}

function titleOptionsFrom(value: unknown): AgentContextPayload["titleOptions"] {
  if (!Array.isArray(value)) return [];
  const titles: AgentContextPayload["titleOptions"] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const id = text(record.id, 80);
    const label = text(record.text, 300);
    if (!id || !label) continue;
    titles.push({ id, text: label });
    if (titles.length >= 20) break;
  }
  return titles;
}

function scenesFrom(value: unknown): AgentContextPayload["scenes"] {
  if (!Array.isArray(value)) return [];
  const scenes: AgentContextPayload["scenes"] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const id = text(record.id, 80);
    const script = text(record.script, 8000);
    if (!id) continue;
    scenes.push({
      id,
      section: text(record.section, 80),
      script,
      durationSeconds: typeof record.durationSeconds === "number" ? record.durationSeconds : 1,
      order: typeof record.order === "number" ? record.order : scenes.length,
      existingPrompt: text(record.existingPrompt, 6000),
    });
    if (scenes.length >= 12) break;
  }
  return scenes;
}

function referenceList(value: unknown): AgentContextPayload["references"] {
  if (!Array.isArray(value)) return [];
  const references: AgentContextPayload["references"] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const url = text(record.url, 2048);
    if (!url) continue;
    references.push({
      url,
      title: text(record.title, 200),
      transcript: text(record.transcript, 8000),
      hasTranscript: record.hasTranscript === true || text(record.transcript, 8000).length > 0,
    });
    if (references.length >= 5) break;
  }
  return references;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").slice(0, 20);
}

function mentionsFrom(value: unknown): MentionId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is MentionId => typeof item === "string" && MENTION_IDS.has(item as MentionId));
}

function historyFrom(value: unknown): { role: "user" | "assistant"; content: string }[] {
  if (!Array.isArray(value)) return [];
  const turns: { role: "user" | "assistant"; content: string }[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (record.role !== "user" && record.role !== "assistant") continue;
    const content = text(record.content, 4000);
    if (!content) continue;
    turns.push({ role: record.role, content });
    if (turns.length >= 12) break;
  }
  return turns;
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return json({ error: "Not found." }, 404);
  }
  if (!isSameOrigin(request)) {
    return json({ error: "Cross-origin requests are not allowed." }, 403);
  }

  let user: { id: string };
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return json({ error: "Unauthorized." }, 401);
    }
    return json({ error: "Unauthorized." }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }
  if (!body || typeof body !== "object") {
    return json({ error: "Invalid body." }, 400);
  }

  const source = body as Record<string, unknown>;
  const message = text(source.message, 8000);
  if (!message) return json({ error: "Message is empty or too long." }, 400);
  const mode: AgentMode | null = source.mode === "ask" || source.mode === "agent" ? source.mode : null;
  if (!mode) return json({ error: "Invalid mode." }, 400);
  const threadId = text(source.threadId, 80);
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(threadId)) return json({ error: "Invalid chat." }, 400);
  const sdkAgentId = text(source.sdkAgentId, 80);
  const agentId = /^agent-[A-Za-z0-9-]{8,80}$/.test(sdkAgentId) ? sdkAgentId : undefined;

  const encoder = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream({
    async start(controller) {
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      const send = (event: string, data: unknown) => {
        if (closed || request.signal.aborted) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        await streamLocalChat({
          threadId,
          sdkAgentId: agentId,
          reset: source.reset === true,
          mode,
          message,
          context: contextFrom(source.context),
          mentions: mentionsFrom(source.mentions),
          dismissed: stringList(source.dismissed),
          history: historyFrom(source.history),
          signal: request.signal,
          userId: user.id,
          onEvent: send,
        });
        if (!request.signal.aborted) send("done", {});
      } catch (error) {
        if (request.signal.aborted) return;
        send("error", { message: localAgentErrorMessage(error) });
      } finally {
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
