export type ScriptSection = {
  label: string;
  body: string;
  durationSeconds: number | null;
};

const SECTION_HEADING =
  /^(HOOK|INTRO|POINT\s+\d+|PROOF|CTA|OUTRO)(?:\s+[—–-]\s+\S.*)?$/i;

/** Timeline scene splitter reads at most this many labeled sections. */
export const MAX_TIMELINE_SECTIONS = 12;
export const MIN_TIMELINE_SECTIONS = 4;

function baseLabel(label: string): string {
  return label.split(/\s+[—–-]\s+/)[0]?.trim().toUpperCase() ?? "";
}

export function canonicalSectionLabel(raw: string): string | null {
  const text = raw.replace(/\s+/g, " ").trim();
  const match = text.match(SECTION_HEADING);
  if (!match?.[1]) return null;
  const head = match[1].toUpperCase().replace(/\s+/g, " ");
  return `${head}${text.slice(match[1].length)}`.trim();
}

export function formatDurationLine(seconds: number): string {
  return `Duration: ${Math.max(1, Math.round(seconds))} sec`;
}

export function parseDurationSeconds(raw: string): number | null {
  const text = raw.trim().toLowerCase();
  const minutes = text.match(/(\d+)\s*(?:min|minute)/);
  const seconds = text.match(/(\d+)\s*(?:sec|second|\bs\b)/);
  if (minutes || seconds) {
    const total = (minutes ? Number(minutes[1]) * 60 : 0) + (seconds ? Number(seconds[1]) : 0);
    return total > 0 ? total : null;
  }
  const plain = text.match(/^(\d+)$/);
  return plain ? Number(plain[1]) : null;
}

/** Keeps each section's share of the video, and makes the seconds add up to the full runtime. */
export function fitSectionDurations(raw: readonly number[], target: number): number[] {
  const count = raw.length;
  if (count === 0) return [];
  const safeTarget = Math.max(count, Math.round(target));
  const weights = raw.map((value) => (value > 0 ? value : 1));
  const weightSum = weights.reduce((total, value) => total + value, 0);
  const exact = weights.map((value) => (value / weightSum) * safeTarget);
  const durations = exact.map((value) => Math.floor(value));
  let leftover = safeTarget - durations.reduce((total, value) => total + value, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const item of order) {
    if (leftover <= 0) break;
    durations[item.index] = (durations[item.index] ?? 0) + 1;
    leftover -= 1;
  }
  while (durations.some((value) => value < 1)) {
    const empty = durations.findIndex((value) => value < 1);
    const donor = durations.reduce(
      (best, value, index) => (value > (durations[best] ?? 0) ? index : best),
      0,
    );
    if ((durations[donor] ?? 0) <= 1 || empty < 0) break;
    durations[donor] = (durations[donor] ?? 0) - 1;
    durations[empty] = 1;
  }
  return durations;
}

export function formatScriptSections(
  sections: ReadonlyArray<{ label: string; script: string; durationSeconds?: number | null }>,
): string {
  return sections
    .map((section) => {
      const label = section.label.trim().replace(/\s+/g, " ");
      const body = section.script
        .replace(/\n{2,}/g, "\n")
        .replace(/^Duration:.*(?:\n|$)/i, "")
        .trim();
      const duration =
        section.durationSeconds && section.durationSeconds > 0
          ? `${formatDurationLine(section.durationSeconds)}\n`
          : "";
      return `${label}\n${duration}${body}`;
    })
    .join("\n\n");
}

/**
 * Sections the timeline can split into clips.
 * Returns null when the script is not in the labeled scene format, so older drafts keep the previous splitter.
 */
export function timelineSectionsFromScript(fullScript: string): ScriptSection[] | null {
  const blocks = fullScript
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0 && !block.startsWith("["));
  if (blocks.length < MIN_TIMELINE_SECTIONS || blocks.length > MAX_TIMELINE_SECTIONS) return null;

  const sections: ScriptSection[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const label = canonicalSectionLabel(lines[0] ?? "");
    if (!label) return null;
    let rest = lines.slice(1);
    let durationSeconds: number | null = null;
    const duration = rest[0]?.match(/^Duration:\s*(.+)$/i);
    if (duration?.[1]) {
      durationSeconds = parseDurationSeconds(duration[1]);
      rest = rest.slice(1);
    }
    const body = rest.join("\n").trim();
    if (!body) return null;
    sections.push({ label, body, durationSeconds });
  }

  if (baseLabel(sections[0]?.label ?? "") !== "HOOK") return null;
  if (baseLabel(sections[sections.length - 1]?.label ?? "") !== "OUTRO") return null;
  return sections;
}

export function sectionDurations(count: number, totalSeconds?: number): number[] {
  const safeCount = Math.max(1, count);
  const total =
    totalSeconds && totalSeconds > 0
      ? Math.max(safeCount * 4, Math.round(totalSeconds))
      : safeCount * 12;
  const base = Math.floor(total / safeCount);
  let remainder = total - base * safeCount;
  return Array.from({ length: safeCount }, () => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return base + extra;
  });
}
