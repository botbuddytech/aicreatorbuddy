export const TITLE_PROMPT_TOPIC = "{{topic}}";
export const TITLE_PROMPT_REFERENCE_TITLES = "{{referenceTitles}}";
export const TITLE_PROMPT_REFERENCE_TRANSCRIPTS = "{{referenceTranscripts}}";

export const DEFAULT_CURSOR_TITLE_PROMPT = `You are an expert YouTube title strategist.

Create exactly six distinct, compelling titles for the supplied video idea.
- Make each title specific, clear, and natural.
- Build curiosity without misleading clickbait.
- Vary the angles and phrasing across the set.
- Match the requested video format and intent.
- Use the topic, reference video titles, and reference transcripts as extra context for the kind of title that fits.
- Keep every title under 100 characters.
- Do not add numbering, commentary, quotation marks, or explanations.

Topic:
{{topic}}

Reference video titles:
{{referenceTitles}}

Reference transcripts:
{{referenceTranscripts}}`;

export function formatReferenceTitles(titles: readonly string[]): string {
  const items = titles.map((title) => title.trim());
  if (!items.some(Boolean)) return "None";
  return items
    .map((title, index) => `${index + 1}. ${title || "Untitled reference"}`)
    .join("\n");
}

export function formatReferenceTranscripts(
  references: readonly { title: string; transcript: string }[],
): string {
  const items = references
    .map((reference) => ({
      title: reference.title.trim(),
      transcript: reference.transcript.trim(),
    }))
    .filter((reference) => reference.title || reference.transcript);
  if (!items.length) return "None";
  return items
    .map((reference, index) => {
      const heading = reference.title || "Untitled reference";
      const transcript = reference.transcript || "No transcript";
      return `${index + 1}. ${heading}\n${transcript}`;
    })
    .join("\n\n");
}

/** Replaces topic, reference title, and reference transcript tokens. Missing tokens are appended. */
export function applyTitlePromptVariables(
  template: string,
  input: {
    topic: string;
    referenceTitles: readonly string[];
    referenceTranscripts?: readonly { title: string; transcript: string }[];
  },
): string {
  const topic = input.topic.trim() || "Not provided";
  const referenceTitles = formatReferenceTitles(input.referenceTitles);
  const referenceTranscripts = formatReferenceTranscripts(
    input.referenceTranscripts ??
      input.referenceTitles.map((title) => ({ title, transcript: "" })),
  );
  let filled = template
    .replaceAll(TITLE_PROMPT_TOPIC, topic)
    .replaceAll(TITLE_PROMPT_REFERENCE_TITLES, referenceTitles)
    .replaceAll(TITLE_PROMPT_REFERENCE_TRANSCRIPTS, referenceTranscripts);
  const extras: string[] = [];
  if (!template.includes(TITLE_PROMPT_TOPIC)) extras.push(`Topic:\n${topic}`);
  if (!template.includes(TITLE_PROMPT_REFERENCE_TITLES)) {
    extras.push(`Reference video titles:\n${referenceTitles}`);
  }
  if (!template.includes(TITLE_PROMPT_REFERENCE_TRANSCRIPTS)) {
    extras.push(`Reference transcripts:\n${referenceTranscripts}`);
  }
  if (extras.length) filled = `${filled.trim()}\n\n${extras.join("\n\n")}`;
  return filled;
}

export const DEFAULT_CURSOR_TITLE_SCORING_PROMPT = `You are an expert YouTube title evaluator.

Score every supplied title for how effectively it would attract the intended YouTube audience while accurately representing the video.
- Consider clarity, specificity, curiosity, audience fit, and suitability for the requested format.
- Use the full 0–100 range consistently.
- Compare all titles against each other, while assigning each an independent score.
- Do not invent search-volume, CTR, or competition data.
- Return only the requested title IDs and integer scores.`;

export const DEFAULT_CURSOR_SCRIPT_SCORING_PROMPT = `You are an expert YouTube script editor.

Evaluate the complete script for its effectiveness as a YouTube video.
- Score the overall script, hook, likely retention, keyword fit, and call to action from 0 to 100.
- Judge the script against its topic, selected title, intent, format, and target duration.
- Identify concise keywords and actionable notes.
- Do not invent audience analytics or claim measured retention data.`;

export const DEFAULT_CURSOR_SCRIPT_LOW_EFFORT_PROMPT = `You are reviewing a YouTube script for low-effort, repetitive, reused, or thin content.

Inspect the complete script against its topic, title, length, and any reference transcripts.
- Flag generic filler, repeated ideas or phrasing, weak original commentary, thin coverage, and copying from the references.
- Return an empty findings list when the script is specific, original, and long enough for the video. That result is a pass. Do not invent a problem to fill the list.
- Use "fail" only when the script is mostly filler, copied, or too thin to be a real video. Use "warn" for a real but fixable problem.
- Give a short overall summary.
- Do not claim to represent YouTube's official classifier or policy enforcement.`;

export const THUMBNAIL_PROMPT_TITLE = "{{title}}";

export const DEFAULT_CURSOR_THUMBNAIL_PROMPT = `You are an expert YouTube thumbnail director.

Write exactly four distinct thumbnail prompts for the selected video title.
Each prompt is a visual brief another image tool can use. Do not create an image.
- Describe the composition, subject, on-image text, colors, and emotion.
- Give each prompt a different visual angle for the same title.
- Keep every prompt under 400 characters.
- Do not add numbering, commentary, or explanations.

Selected title:
{{title}}`;

export function applyThumbnailPromptVariables(template: string, title: string): string {
  const value = title.trim() || "Not provided";
  let filled = template.replaceAll(THUMBNAIL_PROMPT_TITLE, value);
  if (!template.includes(THUMBNAIL_PROMPT_TITLE)) {
    filled = `${filled.trim()}\n\nSelected title:\n${value}`;
  }
  return filled;
}

export const SCRIPT_PROMPT_TOPIC = "{{topic}}";
export const SCRIPT_PROMPT_TITLE = "{{title}}";
export const SCRIPT_PROMPT_LENGTH = "{{length}}";
export const SCRIPT_PROMPT_ORIENTATION = "{{orientation}}";
export const SCRIPT_PROMPT_VIDEO_TYPE = "{{videoType}}";
export const SCRIPT_PROMPT_REFERENCES = "{{references}}";

export const DEFAULT_CURSOR_SCRIPT_PROMPT = `You are an expert YouTube script writer.

Write the spoken script for this video. The timeline splits the script into scenes, so each section must stand alone as one clip.

Video introduction:
Topic / idea: {{topic}}
Length: {{length}}
Orientation: {{orientation}}
Video type: {{videoType}}

Selected title:
{{title}}

Reference videos:
{{references}}

Write for the ear. Use short sentences, a concrete opening, and a clear line from the selected title back to the topic.
Match the length: about 140 spoken words per minute, or about two and a half words per second. That is a natural pace, not rushed and not drawn out.
Time every section in whole seconds at that pace. Each section is one scene. A scene can be shorter than 25 seconds. It must never be longer than 25 seconds.
The hook, call to action, and outro are shorter than a main point. The section times must add up to the video length. Do not lengthen a scene to fill time. Add another POINT scene instead.
Match the video type. A short is one tight idea. A longer video can open a loop, prove it, and close it.
Use the reference videos as a glimpse of the kind of idea, angle, and shape that fits this topic. Do not copy their wording, examples, or sequence.
Do not add camera directions, markdown, hashtags, or a title card.

Always start with HOOK and end with OUTRO. Use INTRO, PROOF, and CTA only when they earn their own scene. A video under one minute uses exactly HOOK, POINT 1, CTA, and OUTRO.
When the video is longer, add POINT 2, POINT 3, POINT 4, and further POINT numbers until every scene is 25 seconds or shorter and the times add up.
You may add a short beat name after an em dash, for example POINT 1 — The real bottleneck.`;

export type ScriptPromptValues = {
  topic: string;
  title: string;
  length: string;
  orientation: string;
  videoType: string;
  references: readonly { title: string; transcript: string }[];
};

const SCRIPT_PROMPT_FIELDS: Array<{
  token: string;
  label: string;
  key: Exclude<keyof ScriptPromptValues, "references">;
}> = [
  { token: SCRIPT_PROMPT_TOPIC, label: "Topic / idea", key: "topic" },
  { token: SCRIPT_PROMPT_TITLE, label: "Selected title", key: "title" },
  { token: SCRIPT_PROMPT_LENGTH, label: "Length", key: "length" },
  { token: SCRIPT_PROMPT_ORIENTATION, label: "Orientation", key: "orientation" },
  { token: SCRIPT_PROMPT_VIDEO_TYPE, label: "Video type", key: "videoType" },
];

/** Replaces the script tokens. Missing tokens are appended so an older prompt still receives the video. */
export function applyScriptPromptVariables(template: string, input: ScriptPromptValues): string {
  const values = Object.fromEntries(
    SCRIPT_PROMPT_FIELDS.map((field) => [field.key, input[field.key].trim() || "Not provided"]),
  ) as Omit<ScriptPromptValues, "references">;
  const references = formatReferenceTranscripts(input.references);
  let filled = template;
  for (const field of SCRIPT_PROMPT_FIELDS) {
    filled = filled.replaceAll(field.token, values[field.key]);
  }
  filled = filled.replaceAll(SCRIPT_PROMPT_REFERENCES, references);
  const extras = SCRIPT_PROMPT_FIELDS.filter((field) => !template.includes(field.token)).map(
    (field) => `${field.label}:\n${values[field.key]}`,
  );
  if (!template.includes(SCRIPT_PROMPT_REFERENCES)) {
    extras.push(`Reference videos:\n${references}`);
  }
  if (extras.length) filled = `${filled.trim()}\n\n${extras.join("\n\n")}`;
  return filled;
}

export const VISUAL_PROMPT_SECTION = "{{section}}";
export const VISUAL_PROMPT_SCRIPT = "{{script}}";
export const VISUAL_PROMPT_DURATION = "{{duration}}";
export const VISUAL_PROMPT_ASPECT_RATIO = "{{aspectRatio}}";
export const VISUAL_PROMPT_TOPIC = "{{topic}}";
export const VISUAL_PROMPT_TITLE = "{{title}}";

export const DEFAULT_CURSOR_VISUAL_PROMPT = `You are an expert video director writing a prompt for an AI video clip.

Write one visual prompt for this scene. Another video tool will use it to generate the clip. Do not create the video.
- Show what the viewer sees, in order, so the picture follows the spoken script.
- The clip must be exactly {{duration}} seconds. Say that length in the prompt, for example "Create a clip of {{duration}} seconds."
- The frame must be exactly {{aspectRatio}}. Say that in the prompt, for example "Aspect ratio {{aspectRatio}}."
- Use the section name and the spoken lines as the story. Do not invent a different scene.
- When the spoken line names a word, phrase, ticker, or number the viewer must read, write that text in the prompt in quotes, exactly as spoken. A line such as "Force majeure" must appear as the readable words "Force majeure", not as a blank block.
- Do not subtitle the whole voiceover. Do not hide the scene's words as illegible, unreadable, fake, or word-shaped marks.
- Describe the shot so a video model can film it: the opening frame, what is in the frame, the camera position and movement, the light, the color, and the closing frame.
- This scene is one shot in a continuous film. Keep the same world, grade, lens, objects, and time of day as the neighboring scenes. If a previous scene exists, open on its last frame and continue the motion. Do not start a new look.
- No people, unless the selected visual style needs characters. The spoken lines are voiceover. Show the words the line is about as readable type.
- Do not add a subtitle track, a title card, or an explanation outside the prompt.

Section:
{{section}}

Spoken script:
{{script}}

Aspect ratio:
{{aspectRatio}}

Topic / idea:
{{topic}}

Selected title:
{{title}}`;

export type VisualPromptValues = {
  section: string;
  script: string;
  duration: string;
  aspectRatio: string;
  topic: string;
  title: string;
};

const VISUAL_PROMPT_FIELDS: Array<{ token: string; label: string; key: keyof VisualPromptValues }> = [
  { token: VISUAL_PROMPT_SECTION, label: "Section", key: "section" },
  { token: VISUAL_PROMPT_SCRIPT, label: "Spoken script", key: "script" },
  { token: VISUAL_PROMPT_DURATION, label: "Duration in seconds", key: "duration" },
  { token: VISUAL_PROMPT_ASPECT_RATIO, label: "Aspect ratio", key: "aspectRatio" },
  { token: VISUAL_PROMPT_TOPIC, label: "Topic / idea", key: "topic" },
  { token: VISUAL_PROMPT_TITLE, label: "Selected title", key: "title" },
];

/** Replaces the visual-prompt tokens. Missing tokens are appended so an older prompt still receives the scene. */
export function applyVisualPromptVariables(template: string, input: VisualPromptValues): string {
  const values = Object.fromEntries(
    VISUAL_PROMPT_FIELDS.map((field) => [field.key, input[field.key].trim() || "Not provided"]),
  ) as VisualPromptValues;
  let filled = template;
  for (const field of VISUAL_PROMPT_FIELDS) {
    filled = filled.replaceAll(field.token, values[field.key]);
  }
  const extras = VISUAL_PROMPT_FIELDS.filter((field) => !template.includes(field.token)).map(
    (field) => `${field.label}:\n${values[field.key]}`,
  );
  if (extras.length) filled = `${filled.trim()}\n\n${extras.join("\n\n")}`;
  return filled;
}

export type CursorPromptKind =
  | "titleGeneration"
  | "titleScoring"
  | "scriptScoring"
  | "scriptLowEffort"
  | "thumbnailPromptGeneration"
  | "scriptGeneration"
  | "visualPromptGeneration";

export const CURSOR_PROMPT_LIMIT = 6_000;

export const CURSOR_PROMPT_DEFAULTS: Record<CursorPromptKind, string> = {
  titleGeneration: DEFAULT_CURSOR_TITLE_PROMPT,
  titleScoring: DEFAULT_CURSOR_TITLE_SCORING_PROMPT,
  scriptScoring: DEFAULT_CURSOR_SCRIPT_SCORING_PROMPT,
  scriptLowEffort: DEFAULT_CURSOR_SCRIPT_LOW_EFFORT_PROMPT,
  thumbnailPromptGeneration: DEFAULT_CURSOR_THUMBNAIL_PROMPT,
  scriptGeneration: DEFAULT_CURSOR_SCRIPT_PROMPT,
  visualPromptGeneration: DEFAULT_CURSOR_VISUAL_PROMPT,
};
