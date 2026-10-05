import "server-only";

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export class ElevenLabsConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ElevenLabsConfigError";
  }
}

let client: ElevenLabsClient | null = null;

export function getElevenLabsClient(): ElevenLabsClient {
  const apiKey = process.env.ELEVEN_LABS_API_KEY?.trim();
  if (!apiKey) {
    throw new ElevenLabsConfigError("ElevenLabs API key is not configured.");
  }
  if (!client) {
    client = new ElevenLabsClient({ apiKey });
  }
  return client;
}
