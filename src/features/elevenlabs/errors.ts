import "server-only";

import { ElevenLabsError } from "@elevenlabs/elevenlabs-js";
import { ElevenLabsConfigError } from "@/features/elevenlabs/client";

export function elevenLabsErrorResponse(error: unknown): { status: number; message: string } {
  if (error instanceof ElevenLabsConfigError) {
    return { status: 503, message: "ElevenLabs is not configured." };
  }
  if (error instanceof ElevenLabsError) {
    const permission = missingPermission(error);
    if (permission) return { status: 403, message: permission };
    if (error.statusCode === 401 || error.statusCode === 403) {
      return { status: 502, message: "ElevenLabs rejected the API key." };
    }
    if (error.statusCode === 429) {
      return { status: 429, message: "ElevenLabs rate limit reached. Try again shortly." };
    }
  }
  return { status: 502, message: "ElevenLabs could not complete this request." };
}

function missingPermission(error: ElevenLabsError): string | null {
  const detail = error.body && typeof error.body === "object"
    ? (error.body as { detail?: { status?: unknown; message?: unknown } }).detail
    : undefined;
  if (detail?.status !== "missing_permissions" || typeof detail.message !== "string") return null;
  const named = detail.message.match(/permission ([a-z0-9_]+)/i)?.[1];
  if (named) return `This ElevenLabs API key needs the ${named} permission.`;
  return "This ElevenLabs API key is missing a required permission.";
}
