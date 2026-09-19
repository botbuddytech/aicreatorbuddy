import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { callVidiqTool, VidiqError } from "@/lib/vidiq/client";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 8_000;

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
  topic: string;
  summary: string;
  format: "long" | "short";
  count: number;
  sessionId?: string;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  if (!topic || topic.length > 500 || !summary || summary.length > 4000) return null;
  return {
    topic,
    summary,
    format: body.format === "shorts" || body.format === "short" ? "short" : "long",
    count:
      typeof body.count === "number" && Number.isInteger(body.count)
        ? Math.max(1, Math.min(10, body.count))
        : 5,
    sessionId:
      typeof body.sessionId === "string" && body.sessionId.length <= 100
        ? body.sessionId
        : undefined,
  };
}

function titlesFromResult(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const result = value as Record<string, unknown>;
  let candidates: unknown[] = [];
  if (Array.isArray(result.titles)) {
    candidates = result.titles;
  } else if (Array.isArray(result.suggestions)) {
    candidates = result.suggestions;
  } else if (result.result && typeof result.result === "object") {
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
    if (!input) return Response.json({ error: "Invalid video context." }, { status: 400 });
    const session = input.sessionId
      ? await prisma.videoSession.findFirst({
          where: { id: input.sessionId, userId: user.id },
          select: { id: true, channel: { select: { channelId: true } } },
        })
      : null;

    const result = await callVidiqTool<unknown>(
      user.id,
      "vidiq_generate_titles",
      {
        title: input.topic,
        description: input.summary,
        analysisSummary: input.summary,
        numTitles: input.count,
        type: input.format,
      },
      {
        sessionId: session?.id,
        step: "TITLE",
        channelId: session?.channel?.channelId,
      },
    );
    const titles = titlesFromResult(result).slice(0, input.count);
    if (!titles.length) throw new Error("vidIQ returned no title suggestions.");
    return Response.json(
      { titles },
      { headers: { "cache-control": "no-store" } },
    );
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
    console.error("[vidiq] title generation failed", error);
    return Response.json({ error: "vidIQ could not generate titles." }, { status: 502 });
  }
}
