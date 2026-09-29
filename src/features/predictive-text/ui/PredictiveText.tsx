"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CompositionEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { sentenceSpan } from "@/features/suggestions/composeSuggestions";
import { useSuggestionLoader } from "@/features/suggestions/useSuggestions";
import type { ComposedSuggestion } from "@/features/suggestions/types";
import { applySuggestion } from "../integration/applySuggestion";
import { moveActiveIndex, suggestionKeyAction } from "../integration/suggestionKeys";
import { SuggestionList } from "./SuggestionList";

type TextControl = HTMLInputElement | HTMLTextAreaElement;

export type PredictiveFieldProps<E extends TextControl = HTMLInputElement> = {
  value: string;
  autoComplete: "off";
  role: "combobox";
  "aria-expanded": boolean;
  "aria-controls": string;
  "aria-autocomplete": "list";
  "aria-activedescendant"?: string;
  onChange: (event: ChangeEvent<E>) => void;
  onKeyDown: (event: KeyboardEvent<E>) => void;
  onKeyUp: (event: KeyboardEvent<E>) => void;
  onBlur: (event: FocusEvent<E>) => void;
  onClick: (event: MouseEvent<E>) => void;
  onSelect: (event: SyntheticEvent<E>) => void;
  onCompositionStart: (event: CompositionEvent<E>) => void;
  onCompositionEnd: (event: CompositionEvent<E>) => void;
};

type PredictiveTextProps<E extends TextControl = HTMLInputElement> = {
  value: string;
  onChange: (value: string) => void;
  children: (inputProps: PredictiveFieldProps<E>) => ReactNode;
};

/**
 * Drop-in wrapper for a controlled input or textarea.
 *
 * ```tsx
 * <PredictiveText value={value} onChange={setValue}>
 *   {(inputProps) => <Input id="topic" placeholder="Topic" {...inputProps} />}
 * </PredictiveText>
 * ```
 *
 * For a textarea, set the type argument:
 * `<PredictiveText<HTMLTextAreaElement> value={value} onChange={setValue}>`.
 */
export function PredictiveText<E extends TextControl = HTMLInputElement>({
  value,
  onChange,
  children,
}: PredictiveTextProps<E>) {
  const rawId = useId().replace(/:/g, "");
  const listId = `predictive-${rawId}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [pendingCursor, setPendingCursor] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const [suggestions, setSuggestions] = useState<ComposedSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [multiline, setMultiline] = useState(false);
  const [caret, setCaret] = useState(0);
  const { load, stop, acceptWords } = useSuggestionLoader();

  const shown = open && suggestions.length > 0;

  useLayoutEffect(() => {
    if (pendingCursor == null) return;
    const field = queryField(containerRef.current);
    if (!field) return;
    try {
      field.setSelectionRange(pendingCursor, pendingCursor);
    } catch {
      // Number inputs and some content controls cannot place a caret.
    }
    setPendingCursor(null);
  }, [pendingCursor, value]);

  function rememberField(target: EventTarget | null) {
    if (target instanceof HTMLTextAreaElement) setMultiline(true);
    else if (target instanceof HTMLInputElement) setMultiline(false);
  }

  function publish(items: ComposedSuggestion[], phase: "replace" | "merge") {
    setSuggestions(items);
    if (phase === "replace") setActiveIndex(0);
    else setActiveIndex((current) => (items.length === 0 ? 0 : Math.min(current, items.length - 1)));
    setOpen(items.length > 0);
  }

  function refresh(text: string, cursor: number) {
    if (composing) {
      stop();
      setOpen(false);
      return;
    }
    setCaret(cursor);
    load(text, cursor, publish);
  }

  function dismiss() {
    stop();
    setOpen(false);
  }

  function accept(index: number) {
    const suggestion = suggestions[index];
    if (!suggestion) return;
    const span =
      suggestion.kind === "phrase"
        ? multiline
          ? sentenceSpan(value, caret)
          : { start: 0, end: value.length }
        : { start: suggestion.replaceStart, end: suggestion.replaceEnd };
    const applied = applySuggestion(value, span.start, span.end, suggestion.text);
    setPendingCursor(applied.cursor);
    acceptWords(suggestion.canonical);
    stop();
    setOpen(false);
    setSuggestions([]);
    onChange(applied.text);
  }

  function readCaret(target: TextControl) {
    refresh(target.value, target.selectionStart ?? target.value.length);
  }

  const inputProps: PredictiveFieldProps<E> = {
    value,
    autoComplete: "off",
    role: "combobox",
    "aria-expanded": shown,
    "aria-controls": listId,
    "aria-autocomplete": "list",
    "aria-activedescendant": shown ? `${listId}-option-${activeIndex}` : undefined,
    onChange: (event) => {
      rememberField(event.target);
      const next = event.target.value;
      onChange(next);
      refresh(next, event.target.selectionStart ?? next.length);
    },
    onKeyDown: (event) => {
      const action = suggestionKeyAction(event.key, {
        open: shown,
        count: suggestions.length,
      });
      if (action.type === "ignore") return;
      event.preventDefault();
      if (action.type === "next") {
        setActiveIndex((current) => moveActiveIndex(current, suggestions.length, 1));
      } else if (action.type === "previous") {
        setActiveIndex((current) => moveActiveIndex(current, suggestions.length, -1));
      } else if (action.type === "accept") {
        accept(activeIndex);
      } else if (action.type === "dismiss") {
        dismiss();
      }
    },
    onKeyUp: (event) => {
      if (composing) return;
      if (event.key === "Escape" || event.key === "Enter" || event.key === "Tab") return;
      if ((event.key === "ArrowUp" || event.key === "ArrowDown") && shown) return;
      if (
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "Home" ||
        event.key === "End" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown"
      ) {
        readCaret(event.currentTarget);
      }
    },
    onBlur: () => {
      dismiss();
    },
    onClick: (event) => {
      rememberField(event.currentTarget);
      readCaret(event.currentTarget);
    },
    onSelect: (event) => {
      if (pendingCursor != null) return;
      readCaret(event.currentTarget);
    },
    onCompositionStart: () => {
      setComposing(true);
      dismiss();
    },
    onCompositionEnd: (event) => {
      setComposing(false);
      rememberField(event.currentTarget);
      const target = event.currentTarget;
      load(target.value, target.selectionStart ?? target.value.length, publish);
    },
  };

  return (
    <div ref={containerRef} className="relative z-30">
      {children(inputProps)}
      {shown ? (
        <SuggestionList
          id={listId}
          suggestions={suggestions}
          activeIndex={activeIndex}
          onHover={setActiveIndex}
          onPick={accept}
        />
      ) : null}
    </div>
  );
}

function queryField(container: HTMLElement | null): TextControl | null {
  const node = container?.querySelector("input, textarea");
  if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) return node;
  return null;
}
