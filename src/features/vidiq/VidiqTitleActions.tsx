"use client";

import { useState } from "react";
import { StepFixModal } from "@/components/create/StepFixModal";
import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { CursorTitleContext } from "@/features/cursor-title-generator/contract";
import type { VideoFormat } from "@/lib/videoProject";

type VidiqTitleActionsProps = {
  context: CursorTitleContext;
  format: VideoFormat;
  sessionId: string;
  onTitles: (titles: string[]) => void;
};

export function useVidiqTitleGeneration({
  context,
  format,
  sessionId,
  onTitles,
}: VidiqTitleActionsProps) {
  const [generating, setGenerating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fixOpen, setFixOpen] = useState(false);

  function requestGeneration() {
    if (generating) return;
    if (!context.topic.trim()) {
      setFixOpen(true);
      return;
    }
    setConfirmOpen(true);
  }

  async function generate() {
    setConfirmOpen(false);
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/vidiq/titles/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic: context.topic,
          summary: [
            `Topic: ${context.topic}`,
            `Format: ${context.format}`,
            `Intent: ${context.intent}`,
            `Duration: ${context.duration}`,
          ].join("\n"),
          format,
          count: 5,
          sessionId,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { titles?: string[]; error?: string }
        | null;
      if (!response.ok || !payload?.titles) {
        throw new Error(payload?.error || "vidIQ could not generate titles.");
      }
      onTitles(payload.titles);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "vidIQ could not generate titles.");
    } finally {
      setGenerating(false);
    }
  }

  return { requestGeneration, generating, error, confirmOpen, setConfirmOpen, generate, fixOpen, setFixOpen };
}

export function VidiqTitleActions(props: VidiqTitleActionsProps) {
  const {
    requestGeneration,
    generating,
    error,
    confirmOpen,
    setConfirmOpen,
    generate,
    fixOpen,
    setFixOpen,
  } = useVidiqTitleGeneration(props);

  return (
    <>
      <ActionButton
        variant="secondary"
        onClick={requestGeneration}
        loading={generating}
        loadingLabel="Generating with vidIQ…"
      >
        Generate using vidIQ
      </ActionButton>
      {error ? (
        <p className="basis-full rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">
          {error}{" "}
          {/connect|enable|reconnect/i.test(error) ? (
            <a href="/dashboard/integrations" className="font-semibold underline">
              Open integrations
            </a>
          ) : null}
        </p>
      ) : null}
      <ConfirmModal
        open={confirmOpen}
        title="Generate titles with vidIQ?"
        description="vidIQ will generate five title suggestions using your connected account. This action uses 5 vidIQ credits."
        confirmLabel="Generate titles"
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void generate()}
      />
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
