"use client";

import { useState, type ReactNode } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import {
  CURSOR_PROMPT_DEFAULTS,
  CURSOR_PROMPT_LIMIT,
  type CursorPromptKind,
} from "@/features/cursor-title-generator/prompt";

type PromptResponse = {
  titleGeneration: string;
  titleScoring: string;
  scriptScoring: string;
  scriptLowEffort: string;
  customized: Record<CursorPromptKind, boolean>;
  error?: string;
};

const LABELS: Record<CursorPromptKind, string> = {
  titleGeneration: "title generation",
  titleScoring: "title scoring",
  scriptScoring: "script scoring",
  scriptLowEffort: "script low-effort analysis",
};

export function CursorPromptEditor({
  kind,
  enabled,
  children,
  className = "",
  compact = false,
}: {
  kind: CursorPromptKind;
  enabled: boolean;
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(CURSOR_PROMPT_DEFAULTS[kind]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<"save" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadAndOpen() {
    if (!enabled) return;
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/cursor-prompts", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as PromptResponse | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.error || "Could not load the Cursor prompt.");
      }
      setPrompt(payload[kind]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the Cursor prompt.");
    } finally {
      setLoading(false);
    }
  }

  async function persist(nextPrompt: string | null) {
    setSaving(nextPrompt === null ? "reset" : "save");
    setError(null);
    try {
      const response = await fetch("/api/cursor-prompts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, prompt: nextPrompt }),
      });
      const payload = (await response.json().catch(() => null)) as PromptResponse | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.error || "Could not save the Cursor prompt.");
      }
      setPrompt(payload[kind]);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the Cursor prompt.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <span className={`inline-flex ${className}`}>
      {children}
      {enabled ? (
        <button
          type="button"
          onClick={loadAndOpen}
          className={`-ml-px whitespace-nowrap border border-border font-semibold text-muted transition-colors hover:bg-white/5 hover:text-foreground ${
            compact ? "rounded-r-lg px-2 text-[10px]" : "rounded-r-xl px-2.5 text-xs"
          }`}
        >
          Edit prompt
        </button>
      ) : null}

      <Modal
        open={open}
        title={`Cursor ${LABELS[kind]} prompt`}
        subtitle="Saved to your account and used for every Cursor request."
        size="lg"
        onClose={() => setOpen(false)}
      >
        <div className="space-y-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted">Loading prompt…</p>
          ) : (
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={12}
              maxLength={CURSOR_PROMPT_LIMIT}
              aria-label={`Cursor ${LABELS[kind]} prompt`}
            />
          )}
          {error ? (
            <p className="rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <ActionButton
              variant="ghost"
              onClick={() => persist(null)}
              disabled={loading || saving !== null}
              loading={saving === "reset"}
              loadingLabel="Resetting…"
            >
              Reset to default
            </ActionButton>
            <ActionButton variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton
              onClick={() => persist(prompt.trim())}
              disabled={loading || saving !== null || !prompt.trim()}
              loading={saving === "save"}
              loadingLabel="Saving…"
            >
              Save prompt
            </ActionButton>
          </div>
        </div>
      </Modal>
    </span>
  );
}
