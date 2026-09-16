"use client";

import { useCallback, useState } from "react";
import { trackSessionEvent } from "@/lib/session/telemetry";
import type { ReferenceVideo } from "@/lib/videoProject";

type TranscriptResponse = {
  ok: true;
  referenceKey: string;
  transcript: string;
  lang: string | null;
  wordCount: number;
  charCount: number;
  durationSec: number | null;
  fetchedAt: string;
};

type FetchInput = {
  reference: ReferenceVideo;
  order: number;
  lang?: string;
};

function isTranscriptResponse(value: unknown): value is TranscriptResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<TranscriptResponse>;
  return (
    response.ok === true &&
    typeof response.referenceKey === "string" &&
    typeof response.transcript === "string" &&
    typeof response.wordCount === "number" &&
    typeof response.charCount === "number" &&
    typeof response.fetchedAt === "string"
  );
}

export function useReferenceTranscript(sessionId: string) {
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const fetchTranscript = useCallback(async ({
    reference,
    order,
    lang,
  }: FetchInput): Promise<TranscriptResponse | null> => {
    setPending((current) => ({ ...current, [reference.id]: true }));
    setErrors((current) => ({ ...current, [reference.id]: null }));
    try {
      const response = await fetch(
        `/api/create/sessions/${encodeURIComponent(sessionId)}/references`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            referenceKey: reference.id,
            url: reference.url,
            order,
            lang,
          }),
        },
      );
      const body = await response.json().catch(() => null) as
        | TranscriptResponse
        | { error?: string; code?: string }
        | null;
      if (!response.ok || !isTranscriptResponse(body)) {
        const message =
          body && "error" in body && body.error
            ? body.error
            : "Could not fetch the transcript. Please try again.";
        setErrors((current) => ({ ...current, [reference.id]: message }));
        trackSessionEvent(sessionId, {
          type: "summary.transcript_failed",
          step: "summary",
          payload: {
            referenceKey: reference.id,
            videoUrl: reference.url,
            code: body && "code" in body ? body.code : undefined,
          },
        });
        return null;
      }
      trackSessionEvent(sessionId, {
        type: "summary.transcript_fetched",
        step: "summary",
        payload: {
          referenceKey: reference.id,
          videoUrl: reference.url,
          lang: body.lang,
          wordCount: body.wordCount,
          charCount: body.charCount,
          durationSec: body.durationSec,
        },
      });
      return body;
    } catch {
      const message = "Could not reach the server. Check your connection and try again.";
      setErrors((current) => ({ ...current, [reference.id]: message }));
      trackSessionEvent(sessionId, {
        type: "summary.transcript_failed",
        step: "summary",
        payload: { referenceKey: reference.id, videoUrl: reference.url, code: "NETWORK_ERROR" },
      });
      return null;
    } finally {
      setPending((current) => ({ ...current, [reference.id]: false }));
    }
  }, [sessionId]);

  const removeReference = useCallback((referenceKey: string): void => {
    void fetch(
      `/api/create/sessions/${encodeURIComponent(sessionId)}/references?referenceKey=${encodeURIComponent(referenceKey)}`,
      { method: "DELETE", keepalive: true },
    ).then((response) => {
      if (!response.ok && response.status !== 404) {
        throw new Error(`reference removal returned ${response.status}`);
      }
    }).catch((error) => {
      // Snapshot sync also performs the hard delete, so a transient failure here self-heals.
      console.error("[video-session] immediate reference removal failed", error);
    });
  }, [sessionId]);

  return { fetchTranscript, removeReference, pending, errors };
}
