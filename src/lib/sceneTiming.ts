/** ElevenLabs reads a bit faster than a careful human, so pause time is planned from this pace. */
const WORDS_PER_SECOND = 2.7;
const MAX_BREAK_SECONDS = 3;

export type SceneBeat = {
  start: number;
  end: number;
  kind: "speech" | "hold";
  text: string;
};

export type SceneTiming = {
  beats: SceneBeat[];
  elevenLabsText: string;
  plannedSeconds: number;
};

function clauses(script: string): string[] {
  const clean = script.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
  const parts = sentences.flatMap((sentence) => {
    const words = sentence.split(/\s+/).filter(Boolean);
    if (words.length <= 14) return [sentence];
    const bits = sentence.split(/(?<=[,;:])\s+/).map((part) => part.trim()).filter(Boolean);
    return bits.length > 1 ? bits : [sentence];
  });
  return parts.length ? parts : [clean];
}

function speechSeconds(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(0.6, words / WORDS_PER_SECOND);
}

function breakTags(seconds: number): string {
  const tags: string[] = [];
  let left = Math.round(seconds * 10) / 10;
  while (left >= 0.3) {
    const slice = Math.min(MAX_BREAK_SECONDS, left);
    tags.push(`<break time="${slice.toFixed(1)}s" />`);
    left = Math.round((left - slice) * 10) / 10;
  }
  return tags.join(" ");
}

/** Spreads the scene's spare time as holds between spoken lines so the voice fills the scene. */
export function planSceneTiming(script: string, durationSeconds: number): SceneTiming {
  const target = Math.max(1, durationSeconds);
  const lines = clauses(script);
  if (lines.length === 0) {
    return { beats: [], elevenLabsText: "", plannedSeconds: 0 };
  }
  const spoken = lines.map((text) => ({ text, seconds: speechSeconds(text) }));
  const speechTotal = spoken.reduce((sum, line) => sum + line.seconds, 0);
  const slack = Math.max(0, target - speechTotal);
  const gaps = spoken.length + 1;
  const weights = Array.from({ length: gaps }, (_, index) =>
    index === 0 || index === gaps - 1 ? 0.15 : 1,
  );
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const holds = weights.map((weight) => (slack * weight) / weightSum);

  const beats: SceneBeat[] = [];
  const pieces: string[] = [];
  let cursor = 0;
  const push = (kind: SceneBeat["kind"], seconds: number, text: string) => {
    const length = Math.max(0, seconds);
    if (length < 0.05 && kind === "hold") return;
    const start = cursor;
    cursor += length;
    beats.push({ start, end: cursor, kind, text });
  };

  holds.forEach((hold, index) => {
    if (hold >= 0.3) {
      push("hold", hold, "Hold this frame. No camera move and no new action.");
      pieces.push(breakTags(hold));
    }
    const line = spoken[index];
    if (!line) return;
    push("speech", line.seconds, line.text);
    pieces.push(line.text);
  });

  return {
    beats,
    elevenLabsText: pieces.filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
    plannedSeconds: cursor,
  };
}

export function formatSceneTiming(script: string, durationSeconds: number): string {
  const { beats } = planSceneTiming(script, durationSeconds);
  if (beats.length === 0) return "";
  return beats
    .map((beat) => {
      const span = `${beat.start.toFixed(1)}–${beat.end.toFixed(1)}s`;
      return beat.kind === "hold" ? `${span} HOLD the current frame. No new action.` : `${span} Show and speak: ${beat.text}`;
    })
    .join("\n");
}
