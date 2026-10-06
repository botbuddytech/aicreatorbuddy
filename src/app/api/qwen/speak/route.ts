import { readSpeakRequest } from "@/features/qwen/contract";
import {
  authorizeQwen,
  qwenFetch,
  qwenJson,
  QwenUpstreamError,
  upstreamErrorMessage,
} from "@/features/qwen/upstream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_REQUEST_BYTES = 64_000;

export async function POST(request: Request) {
  const denied = await authorizeQwen(request);
  if (denied) return denied;

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return qwenJson({ error: "Request is too large." }, 413);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return qwenJson({ error: "Invalid request." }, 400);
  }
  if (rawBody.length > MAX_REQUEST_BYTES) {
    return qwenJson({ error: "Request is too large." }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return qwenJson({ error: "Invalid request." }, 400);
  }
  const input = readSpeakRequest(body);
  if ("error" in input) return qwenJson({ error: input.error }, 400);

  try {
    const upstream = await qwenFetch(
      "/speak",
      {
        method: "POST",
        headers: { "content-type": "application/json", accept: "audio/wav, application/json" },
        body: JSON.stringify(input),
        signal: request.signal,
      },
      280_000,
    );
    const type = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !type.includes("audio") || !upstream.body) {
      const message = await upstreamErrorMessage(upstream, "Could not speak this scene's script.");
      return qwenJson({ error: message }, upstream.ok ? 502 : upstream.status);
    }
    return new Response(upstream.body, {
      headers: {
        "content-type": "audio/wav",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    if (request.signal.aborted) return qwenJson({ error: "Cancelled." }, 499);
    if (error instanceof QwenUpstreamError) {
      return qwenJson({ error: error.message }, error.status);
    }
    console.error("[qwen] speak failed", error);
    return qwenJson({ error: "Could not speak this scene's script." }, 500);
  }
}
