import {
  CursorRunnerError,
  cursorAgentModelLabel,
  runCursorText,
} from "@/features/cursor-title-generator/server/runCursorAgent";
import type { AgentMode } from "@/lib/agent/types";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = { "cache-control": "no-store" };
const MODES = new Set<AgentMode>(["agent", "ask"]);

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

function runnerMessage(error: CursorRunnerError): string {
  switch (error.code) {
    case "busy":
      return "Another Cursor agent task is already running.";
    case "cancelled":
      return "Cursor agent task was cancelled.";
    case "missing-cli":
      return "Cursor Agent CLI was not found. Install it or set CURSOR_AGENT_PATH.";
    case "not-authenticated":
      return "Cursor Agent CLI is not authenticated. Run `agent login` and try again.";
    case "timeout":
      return "Cursor agent task timed out. Try again.";
    case "invalid-output":
      return "Cursor returned an empty or unreadable reply. Try again.";
    case "failed":
      return "Cursor Agent could not answer.";
  }
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return json({ error: "Not found." }, 404);
  }
  if (!isSameOrigin(request)) {
    return json({ error: "Cross-origin requests are not allowed." }, 403);
  }

  try {
    await requireUser();
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
  const message = typeof source.message === "string" ? source.message.trim() : "";
  if (!message || message.length > 8000) {
    return json({ error: "Message is empty or too long." }, 400);
  }
  const mode = source.mode === "ask" || source.mode === "agent" ? source.mode : null;
  if (!mode || !MODES.has(mode)) {
    return json({ error: "Invalid mode." }, 400);
  }
  const model = cursorAgentModelLabel();

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
        send("thinking", { model });
        const text = await runCursorText(message, request.signal);
        if (request.signal.aborted) return;
        send("token", { text });
        send("done", {});
      } catch (error) {
        if (request.signal.aborted) return;
        if (error instanceof CursorRunnerError && error.code === "cancelled") return;
        const detail =
          error instanceof CursorRunnerError
            ? runnerMessage(error)
            : "Cursor Agent could not answer.";
        send("error", { message: detail });
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
