"use client";

import { useEffect, useRef, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { CursorPromptEditor } from "@/features/cursor-title-generator/CursorPromptEditor";
import type {
  CursorScriptScoreRequest,
  CursorScriptScoreResult,
} from "@/features/cursor-script-analysis/contract";

export function ScriptScoreActions({
  input,
  scoringVidiq,
  onScoreVidiq,
  onCursorScore,
}: {
  input: CursorScriptScoreRequest;
  scoringVidiq: boolean;
  onScoreVidiq: () => Promise<void>;
  onCursorScore: (result: CursorScriptScoreResult) => void;
}) {
  const cursorEnabled = process.env.NODE_ENV === "development";
  const [menuOpen, setMenuOpen] = useState(false);
  const [scoringCursor, setScoringCursor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const pointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("pointerdown", pointer);
      document.removeEventListener("keydown", keyboard);
    };
  }, [menuOpen]);

  async function scoreWithCursor() {
    if (!cursorEnabled || scoringCursor || !input.script.trim()) return;
    setMenuOpen(false);
    setScoringCursor(true);
    setError(null);
    try {
      const response = await fetch("/api/local/cursor-script-score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json().catch(() => null)) as
        | (CursorScriptScoreResult & { error?: string })
        | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.error || "Cursor could not score the script.");
      }
      onCursorScore(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cursor could not score the script.");
    } finally {
      setScoringCursor(false);
    }
  }

  return (
    <>
      <span ref={menuRef} className="relative inline-flex">
        <ActionButton
          variant="secondary"
          onClick={() => setMenuOpen((open) => !open)}
          disabled={!input.script.trim()}
          loading={scoringVidiq || scoringCursor}
          loadingLabel="Scoring…"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          Score
        </ActionButton>
        {menuOpen ? (
          <span
            role="menu"
            className="absolute right-0 top-full z-20 mt-1 flex w-52 flex-col gap-1 rounded-xl border border-border bg-surface p-2 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                setMenuOpen(false);
                setError(null);
                await onScoreVidiq();
              }}
              className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-foreground hover:bg-white/5"
            >
              VidIQ
              <span className="block text-xs font-normal text-muted">Static scoring</span>
            </button>
            <CursorPromptEditor
              kind="scriptScoring"
              enabled={cursorEnabled}
              className="w-full"
              compact
            >
              <button
                type="button"
                role="menuitem"
                onClick={scoreWithCursor}
                disabled={!cursorEnabled}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-foreground hover:bg-white/5 disabled:opacity-60 ${
                  cursorEnabled ? "rounded-r-none" : ""
                }`}
              >
                Cursor
                <span className="block text-xs font-normal text-muted">
                  {cursorEnabled ? "Local AI scoring" : "Local only"}
                </span>
              </button>
            </CursorPromptEditor>
          </span>
        ) : null}
      </span>
      {error ? (
        <p className="basis-full rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">
          {error}
        </p>
      ) : null}
    </>
  );
}
