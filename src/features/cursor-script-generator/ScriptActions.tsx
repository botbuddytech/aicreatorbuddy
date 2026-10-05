"use client";

import { useState } from "react";
import {
  scriptFixNotice,
  type CursorScriptRequest,
  type CursorScriptResponse,
  type ScriptFixNotice,
} from "@/features/cursor-script-generator/contract";

type ScriptGenerationProps = {
  request: CursorScriptRequest;
  onScript: (script: string, promptUsed: string) => void;
};

export function useCursorScriptGeneration({
  request,
  onScript,
}: ScriptGenerationProps) {
  const enabled = process.env.NODE_ENV === "development";
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fixNotice, setFixNotice] = useState<ScriptFixNotice | null>(null);

  async function generate() {
    if (generating) return;
    if (!enabled) {
      setError("Cursor script generation is available only while running the app in development.");
      return;
    }
    const notice = scriptFixNotice(request);
    if (notice) {
      setFixNotice(notice);
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/local/cursor-script", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      const payload = (await response.json().catch(() => null)) as
        | (CursorScriptResponse & { error?: string })
        | null;
      if (!response.ok || typeof payload?.script !== "string" || typeof payload.promptUsed !== "string") {
        throw new Error(payload?.error || "Cursor could not generate the script.");
      }
      onScript(payload.script, payload.promptUsed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cursor could not generate the script.");
    } finally {
      setGenerating(false);
    }
  }

  return { enabled, generate, generating, error, fixNotice, setFixNotice };
}
