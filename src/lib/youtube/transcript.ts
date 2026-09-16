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
const FETCH_TIMEOUT_MS = 20_000;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

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
    const response = await fetchTranscript(videoId, {
      ...(lang ? { lang } : {}),
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
    const transcript = cleanText(segments.map((item) => item.text).join(" "))
      .slice(0, MAX_TRANSCRIPT_CHARS);
    const last = segments.at(-1);
    const durationSec = last ? (last.offsetMs + last.durationMs) / 1_000 : null;
    const detectedLang = response.find((item) => item.lang)?.lang ?? lang ?? null;

    if (!transcript) {
      return {
        ok: false,
        code: "NO_CAPTIONS",
        message: "No caption text was returned for this video.",
      };
    }

    return {
      ok: true,
      transcript,
      segments,
      lang: detectedLang,
      charCount: transcript.length,
      wordCount: transcript.split(/\s+/).length,
      durationSec,
    };
  } catch (error) {
    return failure(error);
  }
}
