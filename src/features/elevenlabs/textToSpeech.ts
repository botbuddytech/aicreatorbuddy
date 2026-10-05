import "server-only";

import { getElevenLabsClient } from "@/features/elevenlabs/client";

const DEFAULT_MODEL = "eleven_multilingual_v2";

export type SpeechResult = {
  audio: Uint8Array;
  contentType: "audio/mpeg";
  characterCost: number | null;
  requestId: string | null;
  traceId: string | null;
};

export async function synthesizeSpeech(input: {
  voiceId: string;
  text: string;
  modelId?: string;
}): Promise<SpeechResult> {
  const client = getElevenLabsClient();
  const { data, rawResponse } = await client.textToSpeech
    .convert(input.voiceId, {
      text: input.text,
      modelId: input.modelId ?? DEFAULT_MODEL,
      outputFormat: "mp3_44100_128",
    })
    .withRawResponse();

  const audio = await collectStream(data);
  if (audio.byteLength === 0) {
    throw new Error("ElevenLabs returned no audio.");
  }

  return {
    audio,
    contentType: "audio/mpeg",
    characterCost: headerNumber(rawResponse.headers, "character-cost"),
    requestId: headerText(rawResponse.headers, "request-id"),
    traceId: headerText(rawResponse.headers, "x-trace-id"),
  };
}

async function collectStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value?.byteLength) continue;
    chunks.push(value);
    total += value.byteLength;
  }
  const audio = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    audio.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return audio;
}

function headerText(headers: Headers, name: string): string | null {
  const value = headers.get(name)?.trim();
  return value ? value.slice(0, 200) : null;
}

function headerNumber(headers: Headers, name: string): number | null {
  const value = headers.get(name)?.trim();
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
