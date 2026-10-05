"use client";

import { useState } from "react";
import { StepFixModal } from "@/components/create/StepFixModal";
import { ActionButton } from "@/components/ui/ActionButton";
import { CursorPromptEditor } from "@/features/cursor-title-generator/CursorPromptEditor";
import type {
  CursorTitleContext,
  CursorTitleResponse,
} from "@/features/cursor-title-generator/contract";

type CursorTitleActionsProps = {
  context: CursorTitleContext;
  referenceTitles: string[];
  referenceTranscripts: string[];
  onTitles: (titles: string[], promptUsed: string) => void;
};

export function useCursorTitleGeneration({
  context,
  referenceTitles,
  referenceTranscripts,
  onTitles,
}: CursorTitleActionsProps) {
  const enabled = process.env.NODE_ENV === "development";
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fixOpen, setFixOpen] = useState(false);

  async function generate() {
    if (generating) return;
    if (!enabled) {
      setError("Cursor title generation is available only while running the app in development.");
      return;
    }
    if (!context.topic.trim()) {
      setFixOpen(true);
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/local/cursor-titles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ context, referenceTitles, referenceTranscripts }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (CursorTitleResponse & { error?: string })
        | null;
      if (!response.ok || !payload?.titles || typeof payload.promptUsed !== "string") {
        throw new Error(payload?.error || "Cursor could not generate titles.");
      }
      onTitles(payload.titles, payload.promptUsed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cursor could not generate titles.");
    } finally {
      setGenerating(false);
    }
  }

  return { enabled, generate, generating, error, fixOpen, setFixOpen };
}

export function CursorTitleActions(props: CursorTitleActionsProps) {
  const { enabled, generate, generating, error, fixOpen, setFixOpen } = useCursorTitleGeneration(props);
  const { context, referenceTitles, referenceTranscripts } = props;
  const localOnlyMessage = "Available only while running the app in development.";

  return (
    <>
      <CursorPromptEditor
        kind="titleGeneration"
        enabled={enabled}
        variablePreview={{ topic: context.topic, referenceTitles, referenceTranscripts }}
      >
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
      <StepFixModal
        open={fixOpen}
        step="summary"
        title="No topic or idea selected"
        message="Add a topic or idea there, then generate titles."
        onClose={() => setFixOpen(false)}
      />
    </>
  );
}
