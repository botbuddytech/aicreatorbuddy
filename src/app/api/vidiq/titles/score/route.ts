import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { callVidiqTool, VidiqError } from "@/lib/vidiq/client";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 16_000;

type TitleInput = { id: string; text: string };

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
  titles: TitleInput[];
  format: "long" | "short";
  sessionId?: string;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.titles) || body.titles.length < 1 || body.titles.length > 10) {
    return null;
  }
  const titles: TitleInput[] = [];
  const ids = new Set<string>();
  for (const value of body.titles) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const item = value as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const text = typeof item.text === "string" ? item.text.trim() : "";
    if (!id || id.length > 100 || !text || text.length > 500 || ids.has(id)) return null;
    ids.add(id);
    titles.push({ id, text });
  }
  return {
    titles,
    format: body.format === "shorts" || body.format === "short" ? "short" : "long",
    sessionId:
      typeof body.sessionId === "string" && body.sessionId.length <= 100
        ? body.sessionId
        : undefined,
  };
}

function scoreFromResult(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const result = value as Record<string, unknown>;
  for (const candidate of [
    result.score,
    result.titleScore,
    (result.result as Record<string, unknown> | undefined)?.score,
    (result.data as Record<string, unknown> | undefined)?.score,
  ]) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return Math.max(0, Math.min(100, Math.round(candidate)));
    }
  }
  return null;
}

function vidiqErrorResponse(error: VidiqError) {
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
    if (!input) return Response.json({ error: "Invalid titles." }, { status: 400 });
    const session = input.sessionId
      ? await prisma.videoSession.findFirst({
          where: { id: input.sessionId, userId: user.id },
          select: { id: true, channel: { select: { channelId: true } } },
        })
      : null;

    const scored: Array<{ id: string; score: number; inputIndex: number }> = [];
    for (let index = 0; index < input.titles.length; index += 2) {
      const batch = input.titles.slice(index, index + 2);
      const results = await Promise.all(
        batch.map(async (title, offset) => {
          const result = await callVidiqTool<unknown>(
            user.id,
            "vidiq_score_title",
            {
              title: title.text,
              type: input.format,
              ...(session?.channel?.channelId
                ? { channelId: session.channel.channelId }
                : {}),
            },
            {
              sessionId: session?.id,
              step: "TITLE",
              channelId: session?.channel?.channelId,
            },
          );
          const score = scoreFromResult(result);
          if (score == null) throw new Error("vidIQ returned an invalid title score.");
          return { id: title.id, score, inputIndex: index + offset };
        }),
      );
      scored.push(...results);
    }
    const scores = scored
      .sort((a, b) => b.score - a.score || a.inputIndex - b.inputIndex)
      .map(({ id, score }, index) => ({ id, score, rank: index + 1 }));
    return Response.json(
      { scores },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof VidiqError) return vidiqErrorResponse(error);
    console.error("[vidiq] title scoring failed", error);
    return Response.json({ error: "vidIQ could not score the titles." }, { status: 502 });
  }
}
