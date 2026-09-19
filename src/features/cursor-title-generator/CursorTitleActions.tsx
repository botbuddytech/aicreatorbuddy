"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { CursorPromptEditor } from "@/features/cursor-title-generator/CursorPromptEditor";
import type {
  CursorTitleContext,
  CursorTitleResponse,
} from "@/features/cursor-title-generator/contract";

type CursorTitleActionsProps = {
  context: CursorTitleContext;
  onTitles: (titles: string[]) => void;
};

export function CursorTitleActions({ context, onTitles }: CursorTitleActionsProps) {
  const enabled = process.env.NODE_ENV === "development";
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!enabled || generating) return;
    if (!context.topic.trim()) {
      setError("Add a topic in Video Introduction before generating titles.");
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/local/cursor-titles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ context }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (CursorTitleResponse & { error?: string })
        | null;
      if (!response.ok || !payload?.titles) {
        throw new Error(payload?.error || "Cursor could not generate titles.");
      }
      onTitles(payload.titles);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cursor could not generate titles.");
    } finally {
      setGenerating(false);
    }
  }

  const localOnlyMessage = "Available only while running the app in development.";

  return (
    <>
      <CursorPromptEditor kind="titleGeneration" enabled={enabled}>
        <ActionButton
          variant="secondary"
          onClick={generate}
          disabled={!enabled}
          loading={generating}
          loadingLabel="Generating with Cursor…"
          title={!enabled ? localOnlyMessage : undefined}
          className={enabled ? "rounded-r-none" : ""}
        >
          Generate using Cursor
        </ActionButton>
      </CursorPromptEditor>
      {!enabled ? <span className="self-center text-xs text-muted">Local only</span> : null}
      {error ? (
        <p className="basis-full rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">
          {error}
        </p>
      ) : null}

    </>
  );
}
