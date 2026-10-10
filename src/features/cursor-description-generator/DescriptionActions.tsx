"use client";

import { useState } from "react";
import {
  descriptionFixNotice,
  type CursorDescriptionRequest,
  type CursorDescriptionResponse,
  type DescriptionFixNotice,
} from "@/features/cursor-description-generator/contract";

type DescriptionGenerationProps = {
  request: CursorDescriptionRequest;
  onDescription: (description: string, tags: string[], promptUsed: string) => void;
};

export function useCursorDescriptionGeneration({
  request,
  onDescription,
}: DescriptionGenerationProps) {
  const enabled = process.env.NODE_ENV === "development";
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fixNotice, setFixNotice] = useState<DescriptionFixNotice | null>(null);

  async function generate() {
    if (generating) return;
    if (!enabled) {
      setError(
        "Cursor description generation is available only while running the app in development.",
      );
      return;
    }
    const notice = descriptionFixNotice(request);
    if (notice) {
      setFixNotice(notice);
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/local/cursor-description", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      const payload = (await response.json().catch(() => null)) as
        | (CursorDescriptionResponse & { error?: string })
        | null;
      if (
        !response.ok ||
        typeof payload?.description !== "string" ||
        !Array.isArray(payload?.tags) ||
        typeof payload?.promptUsed !== "string"
      ) {
        throw new Error(payload?.error || "Cursor could not generate the description.");
      }
      onDescription(payload.description, payload.tags, payload.promptUsed);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Cursor could not generate the description.",
      );
    } finally {
      setGenerating(false);
    }
  }

  return { enabled, generate, generating, error, fixNotice, setFixNotice };
}
