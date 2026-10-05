import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { callVidiqTool, VidiqError } from "@/lib/vidiq/client";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 8_000;
const PROMPT_COUNT = 4;

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function parseBody(value: unknown): {
  title: string;
  format: "long" | "short";
  sessionId?: string;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 200) return null;
  return {
    title,
    format: body.format === "shorts" || body.format === "short" ? "short" : "long",
    sessionId:
      typeof body.sessionId === "string" && body.sessionId.length <= 100
        ? body.sessionId
        : undefined,
  };
}

function promptsFromResult(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const result = value as Record<string, unknown>;
  let candidates: unknown[] = [];
  if (Array.isArray(result.titles)) candidates = result.titles;
  else if (Array.isArray(result.suggestions)) candidates = result.suggestions;
  else if (result.result && typeof result.result === "object") {
    const nested = (result.result as Record<string, unknown>).titles;
    if (Array.isArray(nested)) candidates = nested;
  }
  const unique = new Map<string, string>();
  for (const candidate of candidates) {
    const text =
      typeof candidate === "string"
        ? candidate
        : candidate && typeof candidate === "object"
          ? String(
              (candidate as Record<string, unknown>).title ??
                (candidate as Record<string, unknown>).text ??
                "",
            )
          : "";
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized && normalized.length <= 500) {
      unique.set(normalized.toLocaleLowerCase(), normalized);
    }
  }
  return [...unique.values()];
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return Response.json({ error: "Request is too large." }, { status: 413 });
  }

  try {
    const user = await requireUser();
    const rawBody = await request.text();
    if (rawBody.length > MAX_REQUEST_BYTES) {
      return Response.json({ error: "Request is too large." }, { status: 413 });
    }
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }
    const input = parseBody(body);
    if (!input) return Response.json({ error: "A selected title is required." }, { status: 400 });

    const session = input.sessionId
      ? await prisma.videoSession.findFirst({
          where: { id: input.sessionId, userId: user.id },
          select: { id: true, channel: { select: { channelId: true } } },
        })
      : null;

    const description = [
      "Write YouTube thumbnail image prompts, not video titles.",
      "Each suggestion is a visual brief: composition, subject, on-image text, colors, and emotion.",
      "Do not create an image.",
      `Selected title: ${input.title}`,
    ].join("\n");

    const result = await callVidiqTool<unknown>(
      user.id,
      "vidiq_generate_titles",
      {
        title: input.title,
        description,
        analysisSummary: description,
        numTitles: PROMPT_COUNT,
        type: input.format,
      },
      {
        sessionId: session?.id,
        step: "THUMBNAIL",
        channelId: session?.channel?.channelId,
      },
    );
    const prompts = promptsFromResult(result).slice(0, PROMPT_COUNT);
    if (!prompts.length) throw new Error("vidIQ returned no thumbnail prompts.");
    return Response.json({ prompts }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof VidiqError) {
      const status =
        error.code === "not-connected" || error.code === "disabled"
          ? 409
          : error.code === "out-of-credits"
            ? 402
            : error.code === "needs-reauth"
              ? 401
              : 502;
      return Response.json(
        { error: error.message, code: error.code },
        { status, headers: { "cache-control": "no-store" } },
      );
    }
    console.error("[vidiq] thumbnail prompt generation failed", error);
    return Response.json({ error: "vidIQ could not generate thumbnail prompts." }, { status: 502 });
  }
}
