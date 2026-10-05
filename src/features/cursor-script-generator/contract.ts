import {
  canonicalSectionLabel,
  fitSectionDurations,
  formatScriptSections,
} from "@/lib/scriptSections";

export const CURSOR_SCRIPT_LIMITS = {
  topic: 2_000,
  title: 500,
  contextField: 100,
  label: 80,
  section: 8_000,
  script: 80_000,
  minDurationSeconds: 1,
  maxDurationSeconds: 4 * 60 * 60,
  minSections: 4,
  maxSections: 8,
  maxReferences: 5,
  referenceTitle: 200,
  referenceTranscript: 200_000,
} as const;

export type CursorScriptRequest = {
  topic: string;
  title: string;
  length: string;
  orientation: string;
  videoType: string;
  durationSeconds: number;
  references: CursorScriptReference[];
};

export type CursorScriptReference = {
  title: string;
  transcript: string;
};

export type ScriptFixNotice = {
  step: "summary" | "title";
  title: string;
  message: string;
};

const SUMMARY_REQUIREMENTS: Array<{
  title: string;
  phrase: string;
  message: string;
  missing: (input: CursorScriptRequest) => boolean;
}> = [
  {
    title: "No topic or idea",
    phrase: "a topic or idea",
    message: "Add a topic or idea there, then generate the script.",
    missing: (input) => !input.topic.trim(),
  },
  {
    title: "No video type",
    phrase: "a video type",
    message: "Choose Educational or Entertainment there, then generate the script.",
    missing: (input) => !input.videoType.trim(),
  },
  {
    title: "No video orientation",
    phrase: "an orientation",
    message: "Choose Shorts or Long form there, then generate the script.",
    missing: (input) => !input.orientation.trim(),
  },
  {
    title: "No video length",
    phrase: "a video length",
    message: "Set a video length there, then generate the script.",
    missing: (input) => !input.length.trim() || !(input.durationSeconds > 0),
  },
];

function joinPhrases(phrases: string[]): string {
  if (phrases.length <= 1) return phrases[0] ?? "";
  if (phrases.length === 2) return `${phrases[0]} and ${phrases[1]}`;
  return `${phrases.slice(0, -1).join(", ")}, and ${phrases[phrases.length - 1]}`;
}

/** The first step that still needs data before a script can be generated. */
export function scriptFixNotice(input: CursorScriptRequest): ScriptFixNotice | null {
  const summary = SUMMARY_REQUIREMENTS.filter((item) => item.missing(input));
  const titleMissing = !input.title.trim();
  if (summary.length === 0 && !titleMissing) return null;

  if (summary.length === 0) {
    return {
      step: "title",
      title: "No title selected",
      message: "Select a title there, then generate the script.",
    };
  }

  const first = summary[0];
  const notice =
    summary.length === 1 && first
      ? { title: first.title, message: first.message }
      : {
          title: "Video introduction is incomplete",
          message: `Add ${joinPhrases(summary.map((item) => item.phrase))} there, then generate the script.`,
        };

  if (!titleMissing) return { step: "summary", ...notice };
  return {
    step: "summary",
    title: notice.title,
    message: `${notice.message.replace(/\.$/, "")}. Select a title in step 2 as well.`,
  };
}

export type CursorScriptSection = {
  label: string;
  script: string;
  durationSeconds: number;
};

export type CursorScriptResponse = {
  script: string;
  sections: CursorScriptSection[];
  promptUsed: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= max ? text : null;
}

export function parseCursorScriptRequest(value: unknown): CursorScriptRequest | null {
  if (!isRecord(value)) return null;
  const topic = boundedText(value.topic, CURSOR_SCRIPT_LIMITS.topic);
  const title = boundedText(value.title, CURSOR_SCRIPT_LIMITS.title);
  const length = boundedText(value.length, CURSOR_SCRIPT_LIMITS.contextField);
  const orientation = boundedText(value.orientation, CURSOR_SCRIPT_LIMITS.contextField);
  const videoType = boundedText(value.videoType, CURSOR_SCRIPT_LIMITS.contextField);
  const durationSeconds = value.durationSeconds;
  if (
    typeof durationSeconds !== "number" ||
    !Number.isInteger(durationSeconds) ||
    durationSeconds < CURSOR_SCRIPT_LIMITS.minDurationSeconds ||
    durationSeconds > CURSOR_SCRIPT_LIMITS.maxDurationSeconds
  ) {
    return null;
  }
  if (!topic || !title || !length || !orientation || !videoType) return null;
  const references = parseScriptReferences(value.references);
  if (!references) return null;
  return { topic, title, length, orientation, videoType, durationSeconds, references };
}

function parseScriptReferences(value: unknown): CursorScriptReference[] | null {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > CURSOR_SCRIPT_LIMITS.maxReferences) return null;
  const references: CursorScriptReference[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.title !== "string" || typeof item.transcript !== "string") {
      return null;
    }
    const title = item.title.trim().slice(0, CURSOR_SCRIPT_LIMITS.referenceTitle);
    const transcript = item.transcript.trim().slice(0, CURSOR_SCRIPT_LIMITS.referenceTranscript);
    if (!title && !transcript) continue;
    references.push({ title, transcript });
  }
  return references;
}

function sectionBase(label: string): string {
  return label.split(/\s+[—–-]\s+/)[0]?.trim().toUpperCase() ?? "";
}

function spokenScript(label: string, raw: string): string | null {
  const collapsed = raw.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  const withoutHeading = collapsed.replace(
    new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n`, "i"),
    "",
  );
  const script = withoutHeading.replace(/\n{2,}/g, "\n").trim();
  if (!script || script.length > CURSOR_SCRIPT_LIMITS.section) return null;
  return script;
}

export function normalizeCursorScript(
  value: unknown,
  totalSeconds: number,
): CursorScriptSection[] | null {
  if (
    !Number.isInteger(totalSeconds) ||
    totalSeconds < CURSOR_SCRIPT_LIMITS.minDurationSeconds ||
    totalSeconds > CURSOR_SCRIPT_LIMITS.maxDurationSeconds
  ) {
    return null;
  }
  if (!isRecord(value) || !Array.isArray(value.sections)) return null;
  if (
    value.sections.length < CURSOR_SCRIPT_LIMITS.minSections ||
    value.sections.length > CURSOR_SCRIPT_LIMITS.maxSections ||
    value.sections.length > totalSeconds
  ) {
    return null;
  }

  const seen = new Set<string>();
  const sections: Array<Omit<CursorScriptSection, "durationSeconds"> & { durationSeconds: number }> =
    [];
  for (const candidate of value.sections) {
    if (!isRecord(candidate)) return null;
    const label = canonicalSectionLabel(
      typeof candidate.label === "string" ? candidate.label : "",
    );
    if (!label || label.length > CURSOR_SCRIPT_LIMITS.label) return null;
    const base = sectionBase(label);
    if (seen.has(base)) return null;
    seen.add(base);
    if (typeof candidate.script !== "string") return null;
    const script = spokenScript(label, candidate.script);
    const durationSeconds = candidate.durationSeconds;
    if (
      !script ||
      typeof durationSeconds !== "number" ||
      !Number.isInteger(durationSeconds) ||
      durationSeconds < 1 ||
      durationSeconds > CURSOR_SCRIPT_LIMITS.maxDurationSeconds
    ) {
      return null;
    }
    sections.push({ label, script, durationSeconds });
  }

  if (sectionBase(sections[0]?.label ?? "") !== "HOOK") return null;
  if (sectionBase(sections[sections.length - 1]?.label ?? "") !== "OUTRO") return null;
  const fitted = fitSectionDurations(
    sections.map((section) => section.durationSeconds),
    totalSeconds,
  );
  const timed = sections.map((section, index) => ({
    ...section,
    durationSeconds: fitted[index] ?? 1,
  }));
  const script = formatScriptSections(timed);
  if (script.length > CURSOR_SCRIPT_LIMITS.script) return null;
  return timed;
}
