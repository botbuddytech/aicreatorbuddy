import { requireUser } from "@/lib/auth/session";
import {
  getEffectiveCursorPrompts,
  saveCursorPrompt,
} from "@/features/cursor-title-generator/repo";
import {
  CURSOR_PROMPT_LIMIT,
  type CursorPromptKind,
} from "@/features/cursor-title-generator/prompt";

const NO_STORE_HEADERS = { "cache-control": "no-store" };
const PROMPT_KINDS = new Set<CursorPromptKind>([
  "titleGeneration",
  "titleScoring",
  "scriptScoring",
  "scriptLowEffort",
]);

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

function unauthorized(error: unknown): boolean {
  return error instanceof Error && error.message === "UNAUTHORIZED";
}

export async function GET() {
  try {
    const user = await requireUser();
    return json(await getEffectiveCursorPrompts(user.id));
  } catch (error) {
    if (unauthorized(error)) return json({ error: "Unauthorized." }, 401);
    console.error("[cursor-prompts] load failed", error);
    return json({ error: "Could not load Cursor prompts." }, 500);
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) {
    return json({ error: "Cross-origin requests are not allowed." }, 403);
  }

  try {
    const user = await requireUser();
    const raw = await request.text();
    if (raw.length > CURSOR_PROMPT_LIMIT + 1_000) {
      return json({ error: "Prompt is too large." }, 413);
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: "Invalid request." }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "Invalid request." }, 400);
    }

    const value = body as { kind?: unknown; prompt?: unknown };
    if (typeof value.kind !== "string" || !PROMPT_KINDS.has(value.kind as CursorPromptKind)) {
      return json({ error: "Invalid prompt type." }, 400);
    }
    if (value.prompt !== null && typeof value.prompt !== "string") {
      return json({ error: "Invalid prompt." }, 400);
    }
    const prompt = typeof value.prompt === "string" ? value.prompt.trim() : null;
    if (prompt !== null && (!prompt || prompt.length > CURSOR_PROMPT_LIMIT)) {
      return json({ error: "Prompt must be between 1 and 6,000 characters." }, 400);
    }

    return json(
      await saveCursorPrompt(user.id, value.kind as CursorPromptKind, prompt),
    );
  } catch (error) {
    if (unauthorized(error)) return json({ error: "Unauthorized." }, 401);
    console.error("[cursor-prompts] save failed", error);
    return json({ error: "Could not save Cursor prompt." }, 500);
  }
}
