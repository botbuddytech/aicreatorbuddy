import { requireUser } from "@/lib/auth/session";
import { listVisualStyleLibrary, saveVisualStyleDefault } from "@/features/cursor-visual-prompts/repo";
import {
  isVisualStyleId,
  normalizeVisualStylePrompt,
  VISUAL_STYLE_PROMPT_LIMIT,
} from "@/lib/visualStyles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function unauthorized(error: unknown): boolean {
  return error instanceof Error && error.message === "UNAUTHORIZED";
}

export async function GET() {
  try {
    await requireUser();
    return json({ styles: await listVisualStyleLibrary() });
  } catch (error) {
    if (unauthorized(error)) return json({ error: "Unauthorized." }, 401);
    console.error("[visual-styles] load failed", error);
    return json({ error: "Could not load visual styles." }, 500);
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) {
    return json({ error: "Cross-origin requests are not allowed." }, 403);
  }

  try {
    await requireUser();
    const raw = await request.text();
    if (raw.length > VISUAL_STYLE_PROMPT_LIMIT + 1_000) {
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

    const value = body as { id?: unknown; prompt?: unknown };
    if (typeof value.id !== "string" || !isVisualStyleId(value.id)) {
      return json({ error: "Unknown visual style." }, 400);
    }
    const prompt = normalizeVisualStylePrompt(value.prompt);
    if (!prompt) {
      return json(
        { error: `Enter a style prompt between 1 and ${VISUAL_STYLE_PROMPT_LIMIT.toLocaleString()} characters.` },
        400,
      );
    }

    const saved = await saveVisualStyleDefault(value.id, prompt);
    return json({ id: value.id, prompt: saved });
  } catch (error) {
    if (unauthorized(error)) return json({ error: "Unauthorized." }, 401);
    console.error("[visual-styles] save failed", error);
    return json({ error: "Could not save the style prompt." }, 500);
  }
}
