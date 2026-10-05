"use client";

import { useState } from "react";
import type {
  CursorVisualPromptRequest,
  CursorVisualPromptResponse,
} from "@/features/cursor-visual-prompts/contract";

export function useCursorVisualPromptGeneration() {
  const enabled = process.env.NODE_ENV === "development";
  const [generatingId, setGeneratingId] = useState<string | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(
    input: CursorVisualPromptRequest,
  ): Promise<CursorVisualPromptResponse | null> {
    if (generatingId) return null;
    if (!enabled) {
      setError("Cursor prompt generation is available only while running the app in development.");
      return null;
    }
    if (input.scenes.length === 0) {
      setError("Add a spoken script before generating a visual prompt.");
      return null;
    }

    setGeneratingId(input.scenes.length === 1 ? input.scenes[0]?.id ?? "all" : "all");
    setError(null);
    try {
      const response = await fetch("/api/local/cursor-visual-prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json().catch(() => null)) as
        | (CursorVisualPromptResponse & { error?: string })
        | null;
      if (!response.ok || !payload?.prompts || typeof payload.promptUsed !== "string") {
        throw new Error(payload?.error || "Cursor could not generate the visual prompt.");
      }
      return payload;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cursor could not generate the visual prompt.");
      return null;
    } finally {
      setGeneratingId(null);
    }
  }

  return {
    enabled,
    generate,
    generating: generatingId !== null,
    generatingId,
    error,
    setError,
  };
}
