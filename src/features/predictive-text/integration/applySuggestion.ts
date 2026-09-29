export function applySuggestion(
  text: string,
  replaceStart: number,
  replaceEnd: number,
  insertion: string,
): { text: string; cursor: number } {
  const start = clamp(replaceStart, 0, text.length);
  const end = clamp(replaceEnd, start, text.length);
  const next = text.slice(0, start) + insertion + text.slice(end);
  return { text: next, cursor: start + insertion.length };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
