import type { LocalSuggestionProvider } from "./providers/localProvider";
import type { ComposedSuggestion, SuggestionProvider, SuggestionSourceMode } from "./types";

export const MERGED_LIMIT = 8;

export function readSuggestionSource(value: string | undefined): SuggestionSourceMode {
  if (value === "remote" || value === "hybrid" || value === "local") return value;
  if (value === undefined || value.trim() === "") return "hybrid";
  return "local";
}

export function sentenceSpan(text: string, cursor: number): { start: number; end: number } {
  const caret = clamp(cursor, 0, text.length);
  let start = 0;
  for (let index = caret - 1; index >= 0; index -= 1) {
    const char = text[index];
    if (char === "." || char === "!" || char === "?") {
      start = index + 1;
      break;
    }
  }
  while (start < caret && isSpace(text[start] ?? "")) start += 1;
  let end = text.length;
  for (let index = caret; index < text.length; index += 1) {
    const char = text[index];
    if (char === "." || char === "!" || char === "?") {
      end = index + 1;
      break;
    }
  }
  return { start, end };
}

export function mergeSuggestions(
  local: readonly ComposedSuggestion[],
  remote: readonly string[],
  text: string,
  limit = MERGED_LIMIT,
): ComposedSuggestion[] {
  const merged: ComposedSuggestion[] = [];
  const seen = new Set<string>();
  for (const item of local) {
    if (merged.length >= limit) break;
    const key = item.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  for (const phrase of remote) {
    if (merged.length >= limit) break;
    const trimmed = phrase.trim();
    const key = trimmed.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(toPhrase(trimmed, text));
  }
  return merged;
}

export async function collectSuggestions(args: {
  mode: SuggestionSourceMode;
  text: string;
  cursorPosition: number;
  signal?: AbortSignal;
  local: LocalSuggestionProvider;
  remote: SuggestionProvider;
  onUpdate: (items: ComposedSuggestion[], phase: "replace" | "merge") => void;
}): Promise<void> {
  const localItems = args.local.completeAtCaret(args.text, args.cursorPosition, MERGED_LIMIT);
  if (args.signal?.aborted) return;
  if (args.mode === "local") {
    args.onUpdate(localItems, "replace");
    return;
  }

  if (args.mode === "hybrid") args.onUpdate(localItems, "replace");
  const remoteItems = await args.remote.getSuggestions(args.text.slice(0, args.cursorPosition), {
    signal: args.signal,
    limit: MERGED_LIMIT,
  });
  if (args.signal?.aborted) return;

  if (args.mode === "remote") {
    args.onUpdate(
      remoteItems.length > 0 ? remoteItems.map((phrase) => toPhrase(phrase, args.text)) : localItems,
      "replace",
    );
    return;
  }

  args.onUpdate(mergeSuggestions(localItems, remoteItems, args.text), "merge");
}

function toPhrase(phrase: string, text: string): ComposedSuggestion {
  return {
    text: phrase,
    canonical: phrase,
    kind: "phrase",
    replaceStart: 0,
    replaceEnd: text.length,
    score: 0,
    source: "remote",
  };
}

function isSpace(char: string): boolean {
  return /\s/u.test(char);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
