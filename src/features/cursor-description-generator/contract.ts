import { CURSOR_SCRIPT_LIMITS, type CursorScriptReference } from "@/features/cursor-script-generator/contract";

export const CURSOR_DESCRIPTION_LIMITS = {
  script: CURSOR_SCRIPT_LIMITS.script,
  summary: 12_000,
} as const;

export type CursorDescriptionRequest = {
  topic: string;
  title: string;
  length: string;
  orientation: string;
  videoType: string;
  script: string;
  summary: string;
  references: CursorScriptReference[];
};

export type CursorDescriptionResponse = {
  description: string;
  tags: string[];
  promptUsed: string;
};

export type DescriptionFixNotice = {
  step: "summary" | "title" | "script";
  title: string;
  message: string;
};

export function descriptionFixNotice(input: CursorDescriptionRequest): DescriptionFixNotice | null {
  if (!input.title.trim()) {
    return {
      step: "title",
      title: "No selected title",
      message: "Choose a title on the Title step, then generate the description.",
    };
  }
  if (!input.script.trim()) {
    return {
      step: "script",
      title: "No script",
      message: "Add or generate a script on the Script step, then generate the description.",
    };
  }
  if (!input.topic.trim()) {
    return {
      step: "summary",
      title: "No topic or idea",
      message: "Add a topic on the Video intro step, then generate the description.",
    };
  }
  return null;
}

export function parseCursorDescriptionRequest(body: unknown): CursorDescriptionRequest | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const topic = typeof record.topic === "string" ? record.topic.slice(0, CURSOR_SCRIPT_LIMITS.topic) : "";
  const title = typeof record.title === "string" ? record.title.slice(0, CURSOR_SCRIPT_LIMITS.title) : "";
  const length =
    typeof record.length === "string" ? record.length.slice(0, CURSOR_SCRIPT_LIMITS.contextField) : "";
  const orientation =
    typeof record.orientation === "string"
      ? record.orientation.slice(0, CURSOR_SCRIPT_LIMITS.contextField)
      : "";
  const videoType =
    typeof record.videoType === "string"
      ? record.videoType.slice(0, CURSOR_SCRIPT_LIMITS.contextField)
      : "";
  const script =
    typeof record.script === "string"
      ? record.script.slice(0, CURSOR_DESCRIPTION_LIMITS.script)
      : "";
  const summary =
    typeof record.summary === "string"
      ? record.summary.slice(0, CURSOR_DESCRIPTION_LIMITS.summary)
      : "";
  const references: CursorScriptReference[] = [];
  if (Array.isArray(record.references)) {
    for (const item of record.references.slice(0, CURSOR_SCRIPT_LIMITS.maxReferences)) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const ref = item as Record<string, unknown>;
      references.push({
        title:
          typeof ref.title === "string"
            ? ref.title.slice(0, CURSOR_SCRIPT_LIMITS.referenceTitle)
            : "",
        transcript:
          typeof ref.transcript === "string"
            ? ref.transcript.slice(0, CURSOR_SCRIPT_LIMITS.referenceTranscript)
            : "",
      });
    }
  }
  return {
    topic,
    title,
    length,
    orientation,
    videoType,
    script,
    summary,
    references,
  };
}

export function normalizeCursorDescription(value: unknown): { description: string; tags: string[] } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const description = typeof record.description === "string" ? record.description.trim() : "";
  if (!description || description.length > 100_000) return null;
  if (!Array.isArray(record.tags)) return null;
  const tags = record.tags
    .filter((item): item is string => typeof item === "string")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 30);
  if (!tags.length) return null;
  return { description, tags };
}
