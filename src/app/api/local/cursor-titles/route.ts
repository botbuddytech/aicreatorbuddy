import { parseCursorTitleRequest } from "@/features/cursor-title-generator/contract";
import {
  CursorRunnerError,
  generateTitlesWithCursor,
} from "@/features/cursor-title-generator/server/runCursorAgent";
import { getEffectiveCursorPrompts } from "@/features/cursor-title-generator/repo";
import { requireUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 16_000;
const NO_STORE_HEADERS = { "cache-control": "no-store" };

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

function runnerErrorResponse(error: CursorRunnerError) {
  switch (error.code) {
    case "busy":
      return json({ error: "Another Cursor title generation is already running." }, 429);
    case "cancelled":
      return json({ error: "Cursor title generation was cancelled." }, 408);
    case "missing-cli":
      return json(
        { error: "Cursor Agent CLI was not found. Install it or set CURSOR_AGENT_PATH." },
        503,
      );
    case "not-authenticated":
      return json(
        { error: "Cursor Agent CLI is not authenticated. Run `agent login` and try again." },
        503,
      );
    case "timeout":
      return json({ error: "Cursor title generation timed out. Try again." }, 504);
    case "invalid-output":
      return json({ error: "Cursor returned an invalid title set. Try again." }, 502);
    case "failed":
      return json({ error: "Cursor Agent could not generate titles." }, 502);
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
    const user = await requireUser();

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return json({ error: "Request is too large." }, 413);
    }
    const rawBody = await request.text();
    if (rawBody.length > MAX_REQUEST_BYTES) {
      return json({ error: "Request is too large." }, 413);
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return json({ error: "Invalid request." }, 400);
    }
    const input = parseCursorTitleRequest(body);
    if (!input) return json({ error: "Invalid video context." }, 400);

    const prompts = await getEffectiveCursorPrompts(user.id);
    const result = await generateTitlesWithCursor(
      prompts.titleGeneration,
      input,
      request.signal,
    );
    return json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return json({ error: "Unauthorized." }, 401);
    }
    if (error instanceof CursorRunnerError) return runnerErrorResponse(error);
    console.error("[cursor-title-generator] generation failed", error);
    return json({ error: "Cursor Agent could not generate titles." }, 500);
  }
}
