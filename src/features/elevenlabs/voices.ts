import "server-only";

import type { ElevenLabsVoiceListItem } from "@/features/elevenlabs/contract";
import { getElevenLabsClient } from "@/features/elevenlabs/client";

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

export async function listVoices(): Promise<ElevenLabsVoiceListItem[]> {
  const client = getElevenLabsClient();
  const voices: ElevenLabsVoiceListItem[] = [];
  const seen = new Set<string>();
  let nextPageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await client.voices.search({
      pageSize: PAGE_SIZE,
      nextPageToken,
      sort: "name",
      sortDirection: "asc",
      includeTotalCount: false,
    });
    for (const voice of response.voices) {
      const voiceId = voice.voiceId?.trim();
      if (!voiceId || seen.has(voiceId)) continue;
      seen.add(voiceId);
      voices.push({
        voiceId,
        name: voice.name?.trim() || "Untitled voice",
        category: voice.category ?? null,
      });
    }
    if (!response.hasMore || !response.nextPageToken) break;
    nextPageToken = response.nextPageToken;
  }

  voices.sort((a, b) => a.name.localeCompare(b.name));
  return voices;
}
