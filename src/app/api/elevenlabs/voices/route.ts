import { authorizeElevenLabs, elevenLabsJson } from "@/features/elevenlabs/authorize";
import { elevenLabsErrorResponse } from "@/features/elevenlabs/errors";
import { listVoices } from "@/features/elevenlabs/voices";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = await authorizeElevenLabs(request);
  if (denied) return denied;

  try {
    const voices = await listVoices();
    return elevenLabsJson({ voices });
  } catch (error) {
    console.error("[elevenlabs] voice list failed", error);
    const failure = elevenLabsErrorResponse(error);
    return elevenLabsJson({ error: failure.message }, failure.status);
  }
}
