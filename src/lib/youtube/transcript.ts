import {
  fetchTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from "youtube-transcript";

export const MAX_TRANSCRIPT_CHARS = 200_000;
export const MAX_TRANSCRIPT_SEGMENTS = 5_000;
const MAX_VIDEO_TITLE_CHARS = 200;
const FETCH_TIMEOUT_MS = 20_000;
const TITLE_FETCH_TIMEOUT_MS = 8_000;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const INNERTUBE_API_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
const INNERTUBE_CLIENT_VERSION = "20.10.38";
const ENGLISH_LANGUAGE_CODES = ["en", "en-us", "en-gb", "en-in", "en-au", "en-ca"];

export type ReferenceTranscriptErrorCode =
  | "NO_CAPTIONS"
  | "RATE_LIMITED"
  | "VIDEO_UNAVAILABLE"
  | "LANGUAGE_UNAVAILABLE"
  | "FETCH_FAILED";

export type ReferenceTranscriptSegment = {
  text: string;
  offsetMs: number;
  durationMs: number;
};

export type TimestampedTranscriptBlock = {
  startMs: number;
  endMs: number;
  range: string;
  text: string;
};

export type ReferenceTranscriptResult =
  | {
      ok: true;
      transcript: string;
      segments: ReferenceTranscriptSegment[];
      lang: string | null;
      charCount: number;
      wordCount: number;
      durationSec: number | null;
    }
  | {
      ok: false;
      code: ReferenceTranscriptErrorCode;
      message: string;
    };

export function parseYoutubeVideoId(input: string): string | null {
  const value = input.trim();
  if (VIDEO_ID_PATTERN.test(value)) return value;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    let candidate: string | null = null;
    if (hostname === "youtu.be") {
      candidate = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
      candidate = url.searchParams.get("v");
      if (!candidate) {
        const parts = url.pathname.split("/").filter(Boolean);
        if (["shorts", "embed", "live"].includes(parts[0] ?? "")) {
          candidate = parts[1] ?? null;
        }
      }
    }
    return candidate && VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function timestamp(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function parseReferenceTranscriptSegments(
  value: unknown,
): ReferenceTranscriptSegment[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_TRANSCRIPT_SEGMENTS).flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return [];
    const item = candidate as Record<string, unknown>;
    const text = typeof item.text === "string" ? cleanText(item.text) : "";
    const offsetMs = item.offsetMs;
    const durationMs = item.durationMs;
    if (
      !text ||
      typeof offsetMs !== "number" ||
      !Number.isFinite(offsetMs) ||
      offsetMs < 0 ||
      typeof durationMs !== "number" ||
      !Number.isFinite(durationMs) ||
      durationMs < 0
    ) {
      return [];
    }
    return [{ text, offsetMs, durationMs }];
  });
}

export function groupTranscriptByMinute(
  value: unknown,
  durationSec?: number | null,
): TimestampedTranscriptBlock[] {
  const segments = parseReferenceTranscriptSegments(value).sort(
    (a, b) => a.offsetMs - b.offsetMs,
  );
  if (!segments.length) return [];

  const windowMs = 60_000;
  const groups = new Map<number, string[]>();
  for (const segment of segments) {
    const startMs = Math.floor(segment.offsetMs / windowMs) * windowMs;
    groups.set(startMs, [...(groups.get(startMs) ?? []), segment.text]);
  }

  const last = segments.at(-1);
  const inferredEndMs = last ? last.offsetMs + last.durationMs : 0;
  const suppliedEndMs =
    typeof durationSec === "number" && Number.isFinite(durationSec) && durationSec > 0
      ? durationSec * 1_000
      : 0;
  const transcriptEndMs = Math.max(inferredEndMs, suppliedEndMs);

  return [...groups.entries()].map(([startMs, textParts]) => {
    const endMs = Math.min(startMs + windowMs, Math.max(startMs + 1_000, transcriptEndMs));
    return {
      startMs,
      endMs,
      range: `${timestamp(startMs)}–${timestamp(endMs)}`,
      text: cleanText(textParts.join(" ")),
    };
  });
}

export function formatTimestampedTranscript(
  blocks: TimestampedTranscriptBlock[],
): string {
  return blocks
    .map((block) => `${block.range}\n${block.text}`)
    .join("\n\n")
    .slice(0, MAX_TRANSCRIPT_CHARS);
}

export async function fetchYoutubeVideoTitle(videoId: string): Promise<string | null> {
  try {
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(pageUrl)}&format=json`;
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(TITLE_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { title?: unknown };
    if (typeof body.title !== "string") return null;
    const title = cleanText(body.title).slice(0, MAX_VIDEO_TITLE_CHARS);
    return title || null;
  } catch {
    return null;
  }
}

type CaptionTrackList = {
  codes: string[];
  defaultCode: string | null;
};

function languageMatches(code: string, wanted: string): boolean {
  const value = code.toLowerCase();
  const target = wanted.toLowerCase();
  return value === target || value.startsWith(`${target}-`) || value.startsWith(`${target}_`);
}

function findLanguage(codes: readonly string[], wanted: string): string | null {
  const target = wanted.trim().toLowerCase();
  if (!target) return null;
  const exact = codes.find((code) => code.toLowerCase() === target);
  if (exact) return exact;
  if (target === "en") {
    for (const preferred of ENGLISH_LANGUAGE_CODES) {
      const match = codes.find((code) => code.toLowerCase() === preferred);
      if (match) return match;
    }
  }
  return codes.find((code) => languageMatches(code, target)) ?? null;
}

export function selectCaptionLanguage(
  codes: readonly string[],
  options: { requested?: string; defaultCode?: string | null } = {},
): string | null {
  const available = codes.filter((code) => code.trim());
  const requested = options.requested?.trim();
  if (requested) return findLanguage(available, requested);
  return (
    findLanguage(available, "en") ??
    (options.defaultCode && available.includes(options.defaultCode)
      ? options.defaultCode
      : null) ??
    available[0] ??
    null
  );
}

async function listCaptionTracks(
  videoId: string,
  fetchFn: typeof fetch,
): Promise<CaptionTrackList | null> {
  try {
    const response = await fetchFn(INNERTUBE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `com.google.android.youtube/${INNERTUBE_CLIENT_VERSION} (Linux; U; Android 14)`,
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "ANDROID",
            clientVersion: INNERTUBE_CLIENT_VERSION,
          },
        },
        videoId,
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      captions?: {
        playerCaptionsTracklistRenderer?: {
          captionTracks?: Array<{ languageCode?: unknown }>;
          audioTracks?: Array<{ defaultCaptionTrackIndex?: unknown }>;
        };
      };
    };
    const renderer = data.captions?.playerCaptionsTracklistRenderer;
    const codes = (renderer?.captionTracks ?? []).flatMap((track) =>
      typeof track.languageCode === "string" && track.languageCode.trim()
        ? [track.languageCode]
        : [],
    );
    if (!codes.length) return null;
    const defaultIndex = renderer?.audioTracks?.find(
      (track) => typeof track.defaultCaptionTrackIndex === "number",
    )?.defaultCaptionTrackIndex;
    const defaultCode =
      typeof defaultIndex === "number" ? codes[defaultIndex] ?? null : null;
    return { codes, defaultCode };
  } catch {
    return null;
  }
}

function failure(error: unknown): ReferenceTranscriptResult {
  if (
    error instanceof YoutubeTranscriptDisabledError ||
    error instanceof YoutubeTranscriptNotAvailableError
  ) {
    return {
      ok: false,
      code: "NO_CAPTIONS",
      message: "Captions are not available for this video. You can paste a transcript manually.",
    };
  }
  if (error instanceof YoutubeTranscriptTooManyRequestError) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: "YouTube is temporarily rate limiting transcript requests. Please try again later.",
    };
  }
  if (error instanceof YoutubeTranscriptVideoUnavailableError) {
    return {
      ok: false,
      code: "VIDEO_UNAVAILABLE",
      message: "This YouTube video is unavailable or private.",
    };
  }
  if (error instanceof YoutubeTranscriptNotAvailableLanguageError) {
    return {
      ok: false,
      code: "LANGUAGE_UNAVAILABLE",
      message: error.message || "Captions are not available in the requested language.",
    };
  }
  return {
    ok: false,
    code: "FETCH_FAILED",
    message:
      error instanceof Error && error.name === "TimeoutError"
        ? "Fetching captions timed out. Please try again."
        : "Could not fetch captions from YouTube. Please try again or paste them manually.",
  };
}

export async function fetchReferenceTranscript(
  videoId: string,
  lang?: string,
): Promise<ReferenceTranscriptResult> {
  try {
    const timedFetch: typeof fetch = (input, init) =>
      fetch(input, {
        ...init,
        signal: init?.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    // YouTube lists auto-translated captions before the spoken-language track.
    // Prefer English so an English video is not returned in the first translation.
    const tracks = await listCaptionTracks(videoId, timedFetch);
    const selectedLang = tracks
      ? selectCaptionLanguage(tracks.codes, {
          requested: lang,
          defaultCode: tracks.defaultCode,
        })
      : lang?.trim() || "en";
    if (lang?.trim() && tracks && !selectedLang) {
      return {
        ok: false,
        code: "LANGUAGE_UNAVAILABLE",
        message: `Captions are not available in ${lang.trim()}. Available languages: ${tracks.codes.join(", ")}.`,
      };
    }
    const response = await fetchTranscript(videoId, {
      ...(selectedLang ? { lang: selectedLang } : {}),
      fetch: timedFetch,
    });
    const segments = response
      .slice(0, MAX_TRANSCRIPT_SEGMENTS)
      .map((item) => ({
        text: cleanText(item.text),
        offsetMs: item.offset,
        durationMs: item.duration,
      }))
      .filter((item) => item.text);
    const plainTranscript = cleanText(segments.map((item) => item.text).join(" "))
      .slice(0, MAX_TRANSCRIPT_CHARS);
    const last = segments.at(-1);
    const durationSec = last ? (last.offsetMs + last.durationMs) / 1_000 : null;
    const detectedLang = response.find((item) => item.lang)?.lang ?? lang ?? null;

    if (!plainTranscript) {
      return {
        ok: false,
        code: "NO_CAPTIONS",
        message: "No caption text was returned for this video.",
      };
    }
    const transcript =
      formatTimestampedTranscript(groupTranscriptByMinute(segments, durationSec)) ||
      plainTranscript;

    return {
      ok: true,
      transcript,
      segments,
      lang: detectedLang,
      charCount: transcript.length,
      wordCount: plainTranscript.split(/\s+/).length,
      durationSec,
    };
  } catch (error) {
    return failure(error);
  }
}
