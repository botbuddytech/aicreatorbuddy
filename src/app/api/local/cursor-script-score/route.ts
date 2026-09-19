import { parseCursorScriptScoreRequest } from "@/features/cursor-script-analysis/contract";
import { scoreScriptWithCursor } from "@/features/cursor-script-analysis/server/runCursorScriptAnalysis";
import { getEffectiveCursorPrompts } from "@/features/cursor-title-generator/repo";
import { CursorRunnerError } from "@/features/cursor-title-generator/server/runCursorAgent";
import { requireUser } from "@/lib/auth/session";

export const runtime = "nodejs";
const MAX_REQUEST_BYTES = 300_000;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
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

function runnerError(error: CursorRunnerError) {
  if (error.code === "busy") return json({ error: "Another Cursor request is running." }, 429);
  if (error.code === "not-authenticated") {
    return json({ error: "Run `agent login` before using Cursor." }, 503);
  }
  if (error.code === "missing-cli") {
    return json({ error: "Cursor Agent CLI was not found." }, 503);
  }
  if (error.code === "timeout") return json({ error: "Cursor scoring timed out." }, 504);
  if (error.code === "invalid-output") {
    return json({ error: "Cursor returned invalid script scores." }, 502);
  }
  return json({ error: "Cursor could not score the script." }, 502);
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return json({ error: "Not found." }, 404);
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request blocked." }, 403);

  try {
    const user = await requireUser();
    const raw = await request.text();
    if (raw.length > MAX_REQUEST_BYTES) return json({ error: "Script is too large." }, 413);
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: "Invalid request." }, 400);
    }
    const input = parseCursorScriptScoreRequest(body);
    if (!input) return json({ error: "Invalid script or video context." }, 400);
    const prompts = await getEffectiveCursorPrompts(user.id);
    return json(
      await scoreScriptWithCursor(prompts.scriptScoring, input, request.signal),
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return json({ error: "Unauthorized." }, 401);
    }
    if (error instanceof CursorRunnerError) return runnerError(error);
    console.error("[cursor-script-score] failed", error);
    return json({ error: "Cursor could not score the script." }, 500);
  }
}
