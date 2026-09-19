"use client";

import { useEffect, useRef, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { CursorPromptEditor } from "@/features/cursor-title-generator/CursorPromptEditor";
import type {
  CursorTitleContext,
  CursorTitleScoreInput,
  CursorTitleScoreResponse,
} from "@/features/cursor-title-generator/contract";

export function TitleScoreActions({
  titles,
  context,
  scoringVidiq,
  onScoreVidiq,
  onCursorScores,
}: {
  titles: CursorTitleScoreInput[];
  context: CursorTitleContext;
  scoringVidiq: boolean;
  onScoreVidiq: () => Promise<void>;
  onCursorScores: (scores: CursorTitleScoreResponse["scores"]) => void;
}) {
  const cursorEnabled = process.env.NODE_ENV === "development";
  const [menuOpen, setMenuOpen] = useState(false);
  const [scoringCursor, setScoringCursor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  async function scoreWithCursor() {
    if (!cursorEnabled || scoringCursor) return;
    if (!context.topic.trim()) {
      setError("Add a topic in Video Introduction before scoring titles.");
      setMenuOpen(false);
      return;
    }

    setScoringCursor(true);
    setError(null);
    setMenuOpen(false);
    try {
      const response = await fetch("/api/local/cursor-title-scores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ context, titles }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (CursorTitleScoreResponse & { error?: string })
        | null;
      if (!response.ok || !payload?.scores) {
        throw new Error(payload?.error || "Cursor could not score the titles.");
      }
      onCursorScores(payload.scores);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cursor could not score the titles.");
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
          disabled={titles.length === 0}
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
              <span className="block text-xs font-normal text-muted">
                Live scoring · {titles.length * 5} credits
              </span>
            </button>
            <CursorPromptEditor
              kind="titleScoring"
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
