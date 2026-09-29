import { newId, STEPS, type StepId } from "@/lib/videoProject";
import type {
  AgentContextPayload,
  AgentMode,
  ChangePayload,
  ProjectChange,
  StreamEvent,
  ToolCallState,
  ToolName,
} from "@/lib/agent/types";

type Built = {
  events: StreamEvent[];
};

const STEP_ALIASES: { id: StepId; words: string[] }[] = [
  { id: "summary", words: ["intro", "summary"] },
  { id: "title", words: ["title", "titles"] },
  { id: "thumbnail", words: ["thumbnail", "thumb"] },
  { id: "script", words: ["script"] },
  { id: "timeline", words: ["timeline", "scene", "scenes"] },
  { id: "description", words: ["description", "tags"] },
  { id: "render", words: ["render"] },
  { id: "editor", words: ["editor"] },
];

function stepLabel(step: StepId): string {
  return STEPS.find((item) => item.id === step)?.label ?? step;
}

function topicOf(context: AgentContextPayload): string {
  const brief = context.brief.trim();
  return brief || "this video";
}

function chunkText(text: string): string[] {
  const chunks = text.match(/\S+\s*/g);
  return chunks && chunks.length > 0 ? chunks : [text];
}

function proseEvents(text: string): StreamEvent[] {
  return chunkText(text).map((textChunk) => ({ event: "token", text: textChunk }));
}

function toolPair(
  name: ToolName,
  label: string,
  summary: string,
  args: Record<string, unknown>,
  result: unknown,
): StreamEvent[] {
  const id = newId();
  const running: ToolCallState = {
    id,
    name,
    label,
    summary: "",
    status: "running",
    args,
  };
  const done: ToolCallState = {
    ...running,
    status: "done",
    summary,
    result,
  };
  return [
    { event: "tool", tool: running },
    { event: "tool", tool: done },
  ];
}

function changeEvent(
  tool: ToolName,
  field: ProjectChange["field"],
  label: string,
  summary: string,
  before: string,
  after: string,
  payload: ChangePayload,
): StreamEvent {
  const change: ProjectChange = {
    id: newId(),
    tool,
    field,
    label,
    summary,
    before: before.trim() ? before : "(empty)",
    after,
    status: "pending",
    payload,
  };
  return { event: "change", change };
}

function titlesFor(topic: string): string[] {
  return [
    `${topic}: The 60-Second Version`,
    `Stop Doing ${topic} Like This`,
    `I Tried ${topic} So You Don't Have To`,
    `${topic} in One Sitting`,
    `The Only ${topic} Guide You Need`,
  ];
}

function scriptFor(topic: string): string {
  return [
    `Hook: Most people get ${topic} wrong in the first five seconds.`,
    "",
    "Open on the result, not the backstory. One sentence, then the proof.",
    `Show the single step that makes ${topic} feel obvious.`,
    "Name the mistake that kills retention: explaining the tool before the payoff.",
    "Cut to a concrete example. One screen, one action, one outcome.",
    "Pause. Let that land. Then tell them what to do in the next minute.",
    "",
    `CTA: If you only remember one line, make ${topic} feel inevitable. Subscribe for the next cut.`,
  ].join("\n");
}

function tighten(script: string, topic: string): string {
  if (!script.trim()) return scriptFor(topic);
  const lines = script
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);
  return [
    `Hook: ${lines[0] ?? `Most people get ${topic} wrong immediately.`}`,
    "",
    ...lines.slice(1, 4).map((line) => line.replace(/\s+/g, " ")),
    "",
    "CTA: One next step. Say it once, then stop.",
  ].join("\n");
}

function thumbnailFor(topic: string): string {
  return `Close crop, high contrast. Big type: "${topic.split(" ").slice(0, 3).join(" ")}" in white on a red bar. One object, no face, dark background.`;
}

function scenesFor(topic: string, script: string) {
  const source = script.trim();
  const hook = source.split("\n").find((line) => line.trim()) ?? `Hook for ${topic}`;
  return [
    { sectionLabel: "Hook", finalScript: hook },
    {
      sectionLabel: "Payoff",
      finalScript: `Show the one step that makes ${topic} click, then the mistake to avoid.`,
    },
    {
      sectionLabel: "CTA",
      finalScript: "Tell them the single next action and end.",
    },
  ];
}

function descriptionFor(topic: string, title: string): { description: string; tags: string[] } {
  const headline = title.trim() || topic;
  return {
    description: [
      `${headline} — a tight walkthrough of ${topic}.`,
      "",
      "In this video: the hook, the one step that matters, and the mistake to skip.",
      "",
      "Chapters",
      "0:00 Hook",
      "0:08 The step",
      "0:40 What to do next",
    ].join("\n"),
    tags: ["youtube", "script", "thumbnail", "retention", topic.toLowerCase().split(" ")[0] || "video"],
  };
}

function briefFor(topic: string): string {
  if (!topic || topic === "this video") return "A 60-second YouTube short with one clear payoff.";
  return `${topic}. One payoff, 60 seconds, no preamble.`;
}

function findStep(message: string): StepId | null {
  const lower = message.toLowerCase();
  for (const entry of STEP_ALIASES) {
    if (entry.words.some((word) => new RegExp(`\\b${word}\\b`, "i").test(lower))) return entry.id;
  }
  return null;
}

function firstGap(context: AgentContextPayload): StepId {
  if (!context.brief.trim()) return "summary";
  if (!context.title.trim()) return "title";
  if (!context.thumbnail.trim()) return "thumbnail";
  if (!context.script.trim()) return "script";
  if (!context.timeline.trim()) return "timeline";
  if (!context.description.trim()) return "description";
  return "render";
}

type Intent = "brief" | "title" | "script" | "thumbnail" | "timeline" | "description";

function intentsFor(message: string, step: StepId): Intent[] {
  const lower = message.toLowerCase();
  const found = new Set<Intent>();
  if (/\b(brief|intro)\b/.test(lower) || /\brewrite the topic\b/.test(lower)) found.add("brief");
  if (/\btitles?\b/.test(lower)) found.add("title");
  if (/\bscript\b/.test(lower)) found.add("script");
  if (/\b(thumbnail|thumb)\b/.test(lower)) found.add("thumbnail");
  if (/\b(timeline|scenes?)\b/.test(lower)) found.add("timeline");
  if (/\b(description|tags)\b/.test(lower)) found.add("description");
  if (found.size > 0) return [...found];
  const fallback: Record<StepId, Intent | null> = {
    summary: "brief",
    title: "title",
    thumbnail: "thumbnail",
    script: "script",
    timeline: "timeline",
    description: "description",
    render: null,
    editor: null,
  };
  const stepIntent = fallback[step];
  return stepIntent ? [stepIntent] : [];
}

function costFor(events: StreamEvent[], model: string): StreamEvent {
  const text = events
    .filter((item): item is { event: "token"; text: string } => item.event === "token")
    .map((item) => item.text)
    .join("");
  const tokens = Math.max(48, Math.round(text.length / 4) + 36);
  const usd = model === "mock-smart" ? 0.009 : 0.006;
  return { event: "cost", cost: { tokens, usd, model } };
}

function intentEvents(
  intent: Intent,
  context: AgentContextPayload,
  message: string,
): StreamEvent[] {
  const topic = topicOf(context);
  if (intent === "brief") {
    const topicNext = briefFor(topic);
    return [
      ...proseEvents(
        `I tightened the brief around **${topicNext}**.\n\nNothing is saved until you accept the change.\n`,
      ),
      ...toolPair(
        "setBrief",
        "Updating brief…",
        "Updated the brief",
        { topic: topicNext },
        { topic: topicNext },
      ),
      changeEvent(
        "setBrief",
        "brief",
        "Brief",
        "Updated the topic",
        context.brief,
        topicNext,
        { type: "brief", topic: topicNext },
      ),
    ];
  }
  if (intent === "title") {
    const titles = titlesFor(topic);
    const after = titles.map((title, index) => `${index + 1}. ${title}`).join("\n");
    return [
      ...proseEvents(
        `Here are **5 title options** for ${topic}. The first one is the one I would ship.\n\n\`\`\`txt\n${titles[0]}\n\`\`\`\n`,
      ),
      ...toolPair(
        "generateTitles",
        "Writing titles…",
        "Drafted 5 titles",
        { count: 5, topic },
        { titles },
      ),
      changeEvent(
        "generateTitles",
        "title",
        "Titles",
        "Replace the title list",
        context.title,
        after,
        { type: "titles", titles },
      ),
    ];
  }
  if (intent === "script") {
    const editing = /\b(tighten|shorter|cut|trim|60)\b/i.test(message) && context.script.trim();
    const script = editing ? tighten(context.script, topic) : scriptFor(topic);
    const tool: ToolName = editing ? "editScript" : "generateScript";
    return [
      ...proseEvents(
        editing
          ? `I tightened the script toward **60 seconds**. Hook, one step, then a single CTA.\n`
          : `Drafted a **60-second script** about ${topic}. It stays on one idea.\n\n\`\`\`txt\nHook → step → CTA\n\`\`\`\n`,
      ),
      ...toolPair(
        tool,
        editing ? "Editing script…" : "Writing script…",
        editing ? "Tightened the script" : "Drafted a 60s script",
        { topic, seconds: 60 },
        { words: script.split(/\s+/).filter(Boolean).length },
      ),
      changeEvent(
        tool,
        "script",
        "Script",
        editing ? "Tightened the script" : "Replace the script",
        context.script,
        script,
        { type: "script", script },
      ),
    ];
  }
  if (intent === "thumbnail") {
    const concept = thumbnailFor(topic);
    return [
      ...proseEvents(`Thumbnail concept for **${topic}**: high contrast, three words, no face.\n`),
      ...toolPair(
        "generateThumbnailPrompt",
        "Sketching thumbnail…",
        "Suggested a thumbnail concept",
        { topic },
        { concept },
      ),
      changeEvent(
        "generateThumbnailPrompt",
        "thumbnail",
        "Thumbnail",
        "Add a thumbnail concept",
        context.thumbnail,
        concept,
        { type: "thumbnail", concept },
      ),
    ];
  }
  if (intent === "timeline") {
    const scenes = scenesFor(topic, context.script);
    const after = scenes.map((scene) => `${scene.sectionLabel}: ${scene.finalScript}`).join("\n");
    return [
      ...proseEvents(`Split the piece into **3 scenes**: hook, payoff, CTA.\n`),
      ...toolPair(
        "updateTimeline",
        "Building timeline…",
        "Split the script into scenes",
        { scenes: scenes.length },
        { scenes: scenes.map((scene) => scene.sectionLabel) },
      ),
      changeEvent(
        "updateTimeline",
        "timeline",
        "Timeline",
        "Replace the scene list",
        context.timeline,
        after,
        { type: "timeline", scenes },
      ),
    ];
  }
  const copy = descriptionFor(topic, context.title.split("\n")[0] ?? "");
  const after = `${copy.description}\n\nTags: ${copy.tags.join(", ")}`;
  return [
    ...proseEvents(`Description draft for **${topic}**, with a short chapter list and tags.\n`),
    ...toolPair(
      "writeDescription",
      "Writing description…",
      "Drafted the description",
      { topic },
      { tags: copy.tags },
    ),
    changeEvent(
      "writeDescription",
      "description",
      "Description",
      "Replace the description",
      context.description,
      after,
      { type: "description", description: copy.description, tags: copy.tags },
    ),
  ];
}

export function buildMockEvents(input: {
  message: string;
  mode: AgentMode;
  step: StepId;
  model: string;
  context: AgentContextPayload;
}): Built {
  const topic = topicOf(input.context);
  const smart = input.model === "mock-smart" ? " I kept the change small so you can reject it cleanly." : "";

  if (input.mode === "ask") {
    const events: StreamEvent[] = [
      ...proseEvents(
        `Ask mode is read-only, so I will not edit the project.${smart}\n\nOn **${stepLabel(input.step)}**, ${topic} is the brief. ${
          input.context.script.trim()
            ? "The script already has a draft — I would tighten the hook before adding scenes."
            : "There is no script yet. A 60-second version should open on the payoff, not the setup."
        }\n`,
      ),
    ];
    events.push(costFor(events, input.model));
    events.push({ event: "done" });
    return { events };
  }

  const lower = input.message.toLowerCase();
  if (/\b(go to|open|jump to|navigate|switch to)\b/.test(lower)) {
    const target = /\bfirst incomplete\b/.test(lower)
      ? firstGap(input.context)
      : (findStep(input.message) ?? input.step);
    const events: StreamEvent[] = [
      ...proseEvents(`I can open **${stepLabel(target)}**. Accept to switch steps.\n`),
      ...toolPair(
        "navigateToStep",
        "Opening step…",
        `Ready to open ${stepLabel(target)}`,
        { step: target },
        { step: target },
      ),
      changeEvent(
        "navigateToStep",
        "step",
        "Step",
        `Open ${stepLabel(target)}`,
        stepLabel(input.step),
        stepLabel(target),
        { type: "navigate", step: target },
      ),
    ];
    events.push(costFor(events, input.model));
    events.push({ event: "done" });
    return { events };
  }

  if (/\bapprove\b/.test(lower)) {
    const target = findStep(input.message) ?? input.step;
    const events: StreamEvent[] = [
      ...proseEvents(`I can mark **${stepLabel(target)}** approved. Nothing changes until you accept.\n`),
      ...toolPair(
        "markStepApproved",
        "Marking step approved…",
        `Proposed approval for ${stepLabel(target)}`,
        { step: target },
        { status: "approved" },
      ),
      changeEvent(
        "markStepApproved",
        "step",
        "Status",
        `Approve ${stepLabel(target)}`,
        "Current status",
        "Approved",
        { type: "approve", step: target },
      ),
    ];
    events.push(costFor(events, input.model));
    events.push({ event: "done" });
    return { events };
  }

  const intents = intentsFor(input.message, input.step);
  if (intents.length === 0) {
    const gap = firstGap(input.context);
    const events: StreamEvent[] = [
      ...proseEvents(
        `Nothing on this step needs a rewrite from that note.${smart}\n\nThe first gap I see is **${stepLabel(gap)}**. Ask me to draft it, or jump there.\n`,
      ),
    ];
    events.push(costFor(events, input.model));
    events.push({ event: "done" });
    return { events };
  }

  const events = intents.flatMap((intent) => intentEvents(intent, input.context, input.message));
  if (smart) {
    events.push(...proseEvents(smart.trimStart() + "\n"));
  }
  events.push(costFor(events, input.model));
  events.push({ event: "done" });
  return { events };
}
