"use client";

import { useState, type ReactNode } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import {
  CURSOR_PROMPT_DEFAULTS,
  CURSOR_PROMPT_LIMIT,
  TITLE_PROMPT_REFERENCE_TITLES,
  TITLE_PROMPT_REFERENCE_TRANSCRIPTS,
  TITLE_PROMPT_TOPIC,
  formatReferenceTitles,
  formatReferenceTranscripts,
  type CursorPromptKind,
} from "@/features/cursor-title-generator/prompt";

type PromptResponse = {
  titleGeneration: string;
  titleScoring: string;
  scriptScoring: string;
  scriptLowEffort: string;
  thumbnailPromptGeneration: string;
  scriptGeneration: string;
  descriptionGeneration: string;
  visualPromptGeneration: string;
  customized: Record<CursorPromptKind, boolean>;
  error?: string;
};

const LABELS: Record<CursorPromptKind, string> = {
  titleGeneration: "title generation",
  titleScoring: "title scoring",
  scriptScoring: "script scoring",
  scriptLowEffort: "script low-effort analysis",
  thumbnailPromptGeneration: "thumbnail prompt",
  scriptGeneration: "script",
  descriptionGeneration: "description",
  visualPromptGeneration: "visual editing",
};

function ChevronDown({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${className}`}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CollapsibleVideoValues({ children }: { children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-border bg-surface-soft text-sm">
      <summary
        className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden"
      >
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
          Values for this video
        </span>
        <ChevronDown className="group-open:rotate-180" />
      </summary>
      <div className="border-t border-border px-3 py-2.5">{children}</div>
    </details>
  );
}

export function CursorPromptEditor({
  kind,
  enabled,
  children,
  className = "",
  compact = false,
  standalone = false,
  label = "Edit prompt",
  icon,
  variablePreview,
  variables,
}: {
  kind: CursorPromptKind;
  enabled: boolean;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
  standalone?: boolean;
  label?: string;
  icon?: ReactNode;
  variablePreview?: {
    topic: string;
    referenceTitles: string[];
    referenceTranscripts?: string[];
  };
  variables?: Array<{ token: string; value: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(CURSOR_PROMPT_DEFAULTS[kind]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<"save" | "reset" | "default" | null>(null);
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

  async function persist(nextPrompt: string | null, saveAsDefault = false) {
    setSaving(nextPrompt === null ? "reset" : saveAsDefault ? "default" : "save");
    setError(null);
    try {
      const response = await fetch("/api/cursor-prompts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, prompt: nextPrompt, saveAsDefault }),
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
          className={
            standalone
              ? "inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-white/5"
              : `-ml-px inline-flex items-center gap-1.5 whitespace-nowrap border border-border font-semibold text-muted transition-colors hover:bg-white/5 hover:text-foreground ${
                  compact ? "rounded-r-lg px-2 text-[10px]" : "rounded-r-xl px-2.5 text-xs"
                }`
          }
        >
          {icon}
          {label}
        </button>
      ) : null}

      <Modal
        open={open}
        title={`Cursor ${LABELS[kind]} prompt`}
        subtitle={
          variables
            ? variables.length > 2
              ? "These tokens are filled from this video when you generate."
              : `${variables.map((item) => item.token).join(" and ")} is filled from this video when you generate.`
            : variablePreview
              ? `${TITLE_PROMPT_TOPIC}, ${TITLE_PROMPT_REFERENCE_TITLES}, and ${TITLE_PROMPT_REFERENCE_TRANSCRIPTS} are filled from this video when you generate.`
              : "Saved to your account and used for every Cursor request."
        }
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
          {variables ? (
            <CollapsibleVideoValues>
              {variables.map((item) => (
                <div key={item.token}>
                  <p className="mt-2 font-medium text-foreground first:mt-0">{item.token}</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-muted">
                    {item.value.trim() || "Not provided"}
                  </p>
                </div>
              ))}
            </CollapsibleVideoValues>
          ) : variablePreview ? (
            <CollapsibleVideoValues>
              <p className="font-medium text-foreground">{TITLE_PROMPT_TOPIC}</p>
              <p className="mt-0.5 whitespace-pre-wrap text-muted">
                {variablePreview.topic.trim() || "Not provided"}
              </p>
              <p className="mt-2 font-medium text-foreground">{TITLE_PROMPT_REFERENCE_TITLES}</p>
              <p className="mt-0.5 whitespace-pre-wrap text-muted">
                {formatReferenceTitles(variablePreview.referenceTitles)}
              </p>
              <p className="mt-2 font-medium text-foreground">
                {TITLE_PROMPT_REFERENCE_TRANSCRIPTS}
              </p>
              <p className="mt-0.5 max-h-48 overflow-y-auto whitespace-pre-wrap text-muted">
                {formatReferenceTranscripts(
                  variablePreview.referenceTitles.map((title, index) => ({
                    title,
                    transcript: variablePreview.referenceTranscripts?.[index] ?? "",
                  })),
                )}
              </p>
            </CollapsibleVideoValues>
          ) : null}
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
            <ActionButton
              variant="secondary"
              onClick={() => persist(prompt.trim(), true)}
              disabled={loading || saving !== null || !prompt.trim()}
              loading={saving === "default"}
              loadingLabel="Saving default…"
            >
              Save as default
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
