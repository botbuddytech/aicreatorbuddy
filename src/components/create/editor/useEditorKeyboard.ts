"use client";

import { useEffect } from "react";

type EditorKeyboardHandlers = {
  onTogglePlay: () => void;
  onStepFrame: (delta: number) => void;
  onSeekStart: () => void;
  onSeekEnd: () => void;
};

/** Remotion Studio–style shortcuts while the editor workspace is focused. */
export function useEditorKeyboard(
  enabled: boolean,
  handlers: EditorKeyboardHandlers,
) {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        handlers.onTogglePlay();
        return;
      }
      if (event.key === "k" || event.key === "K") {
        event.preventDefault();
        handlers.onTogglePlay();
        return;
      }
      if (event.key === "j" || event.key === "J") {
        event.preventDefault();
        handlers.onStepFrame(-1);
        return;
      }
      if (event.key === "l" || event.key === "L") {
        event.preventDefault();
        handlers.onStepFrame(1);
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        handlers.onSeekStart();
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        handlers.onSeekEnd();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, handlers]);
}
