"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import {
  VISUAL_STYLE_PROMPT_LIMIT,
  visualStyleById,
  type VisualStyleId,
} from "@/lib/visualStyles";

type LibraryStyle = { id: VisualStyleId; label: string; prompt: string };

export function StylePromptEditor({
  styleId,
  sessionPrompt,
  onSaveSession,
  onUseLibrary,
}: {
  styleId: VisualStyleId | null;
  sessionPrompt: string | null;
  onSaveSession: (prompt: string) => void;
  onUseLibrary: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [libraryPrompt, setLibraryPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<"save" | "default" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const style = styleId ? visualStyleById(styleId) : null;

  async function loadAndOpen() {
    if (!styleId || !style) return;
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/visual-styles", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | { styles?: LibraryStyle[]; error?: string }
        | null;
      if (!response.ok || !payload?.styles) {
        throw new Error(payload?.error || "Could not load the style prompt.");
      }
      const library = payload.styles.find((item) => item.id === styleId)?.prompt || style.prompt;
      setLibraryPrompt(library);
      setPrompt(sessionPrompt || library);
    } catch (cause) {
      const fallback = sessionPrompt || style.prompt;
      setLibraryPrompt(style.prompt);
      setPrompt(fallback);
      setError(cause instanceof Error ? cause.message : "Could not load the style prompt.");
    } finally {
      setLoading(false);
    }
  }

  async function saveAsDefault() {
    if (!styleId) return;
    const next = prompt.trim();
    if (!next || next.length > VISUAL_STYLE_PROMPT_LIMIT) return;
    setSaving("default");
    setError(null);
    try {
      const response = await fetch("/api/visual-styles", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: styleId, prompt: next }),
      });
      const payload = (await response.json().catch(() => null)) as { prompt?: string; error?: string } | null;
      if (!response.ok || typeof payload?.prompt !== "string") {
        throw new Error(payload?.error || "Could not save the style prompt as the default.");
      }
      onUseLibrary();
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the style prompt as the default.");
    } finally {
      setSaving(null);
    }
  }

  function saveForSession() {
    const next = prompt.trim();
    if (!styleId || !next || next.length > VISUAL_STYLE_PROMPT_LIMIT) return;
    setSaving("save");
    onSaveSession(next);
    setSaving(null);
    setOpen(false);
  }

  function resetToLibrary() {
    setSaving("reset");
    setPrompt(libraryPrompt || style?.prompt || "");
    onUseLibrary();
    setSaving(null);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        disabled={!styleId}
        title={styleId ? "Edit the prompt for this style" : "Choose a style first"}
        onClick={() => void loadAndOpen()}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Edit style prompt
      </button>
      <Modal
        open={open}
        title={style ? `${style.label} style prompt` : "Style prompt"}
        subtitle="Save keeps this wording on this video. Save as default updates the shared prompt for this style."
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
              maxLength={VISUAL_STYLE_PROMPT_LIMIT}
              aria-label={style ? `${style.label} style prompt` : "Style prompt"}
            />
          )}
          <p className="text-xs text-muted">
            {sessionPrompt
              ? "This video is using its own copy. Other videos keep the shared prompt until you save as default."
              : "This video is using the shared prompt for this style."}
          </p>
          {error ? (
            <p className="rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <ActionButton
              variant="ghost"
              onClick={resetToLibrary}
              disabled={loading || saving !== null}
              loading={saving === "reset"}
              loadingLabel="Resetting…"
            >
              Reset to default
            </ActionButton>
            <ActionButton
              variant="secondary"
              onClick={() => void saveAsDefault()}
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
              onClick={saveForSession}
              disabled={loading || saving !== null || !prompt.trim()}
              loading={saving === "save"}
              loadingLabel="Saving…"
            >
              Save prompt
            </ActionButton>
          </div>
        </div>
      </Modal>
    </>
  );
}
