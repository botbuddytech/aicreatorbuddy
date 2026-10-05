"use client";

import { useState } from "react";
import type { CursorThumbnailPromptResponse } from "@/features/cursor-thumbnail-prompts/contract";

type ThumbnailPromptGenerationProps = {
  title: string;
  format: string;
  intent: string;
  onPrompts: (prompts: string[], promptUsed: string) => void;
};

export function useCursorThumbnailPromptGeneration({
  title,
  format,
  intent,
  onPrompts,
}: ThumbnailPromptGenerationProps) {
  const enabled = process.env.NODE_ENV === "development";
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fixOpen, setFixOpen] = useState(false);

  async function generate() {
    if (generating) return;
    if (!enabled) {
      setError("Cursor prompt generation is available only while running the app in development.");
      return;
    }
    if (!title.trim()) {
      setFixOpen(true);
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/local/cursor-thumbnail-prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim(), format, intent }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (CursorThumbnailPromptResponse & { error?: string })
        | null;
      if (!response.ok || !payload?.prompts || typeof payload.promptUsed !== "string") {
        throw new Error(payload?.error || "Cursor could not generate thumbnail prompts.");
      }
      onPrompts(payload.prompts, payload.promptUsed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cursor could not generate thumbnail prompts.");
    } finally {
      setGenerating(false);
    }
  }

  return { enabled, generate, generating, error, fixOpen, setFixOpen };
}
