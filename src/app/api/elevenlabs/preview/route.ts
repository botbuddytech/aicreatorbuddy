import { authorizeElevenLabs, elevenLabsJson } from "@/features/elevenlabs/authorize";
import { parsePreviewRequest } from "@/features/elevenlabs/contract";
import { elevenLabsErrorResponse } from "@/features/elevenlabs/errors";
import { synthesizeSpeech } from "@/features/elevenlabs/textToSpeech";
import { planSceneTiming } from "@/lib/sceneTiming";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 8_000;

export async function POST(request: Request) {
  const denied = await authorizeElevenLabs(request);
  if (denied) return denied;

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return elevenLabsJson({ error: "Request is too large." }, 413);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return elevenLabsJson({ error: "Invalid request." }, 400);
  }
  if (rawBody.length > MAX_REQUEST_BYTES) {
    return elevenLabsJson({ error: "Request is too large." }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return elevenLabsJson({ error: "Invalid request." }, 400);
  }
  const input = parsePreviewRequest(body);
  if (!input) return elevenLabsJson({ error: "Choose a voice and add a script to preview." }, 400);

  try {
    const paced = input.durationSeconds
      ? planSceneTiming(input.text, input.durationSeconds).elevenLabsText
      : input.text;
    const speech = await synthesizeSpeech({ voiceId: input.voiceId, text: paced || input.text });
    const headers = new Headers({
      "content-type": speech.contentType,
      "cache-control": "no-store",
    });
    if (speech.characterCost !== null) headers.set("x-character-cost", String(speech.characterCost));
    if (speech.requestId) headers.set("x-request-id", speech.requestId);
    if (speech.traceId) headers.set("x-trace-id", speech.traceId);
    return new Response(Buffer.from(speech.audio), { headers });
  } catch (error) {
    console.error("[elevenlabs] preview failed", error);
    const failure = elevenLabsErrorResponse(error);
    return elevenLabsJson({ error: failure.message }, failure.status);
  }
}
