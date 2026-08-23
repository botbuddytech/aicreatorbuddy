import { sceneVisualImageUrl } from "@/lib/sceneVisualImage";
import {
  createEmptyScene,
  FORMAT_LABELS,
  formatDurationLabel,
  INTENT_LABELS,
  newId,
  type AiProvider,
  type Scene,
  type ThumbnailOption,
  type TitleOption,
  type VideoSummary,
  type VidIqScriptInsight,
  type VidIqThumbInsight,
  type VidIqTitleInsight,
} from "@/lib/videoProject";

export type StockClip = {
  id: string;
  title: string;
  duration: number;
  source: string;
  keywords: string[];
  hue: number;
};

export const mockStockClips: StockClip[] = [
  { id: "clip-desk-night", title: "Laptop on a dark desk", duration: 8, source: "Pexels", keywords: ["laptop", "desk", "night", "work"], hue: 220 },
  { id: "clip-city-timelapse", title: "City timelapse at dusk", duration: 12, source: "Pexels", keywords: ["city", "timelapse", "skyline"], hue: 265 },
  { id: "clip-keyboard", title: "Mechanical keyboard close-up", duration: 6, source: "Pixabay", keywords: ["keyboard", "typing", "hands"], hue: 18 },
  { id: "clip-charts", title: "Analytics dashboard pan", duration: 9, source: "Pexels", keywords: ["charts", "dashboard", "data"], hue: 200 },
  { id: "clip-studio", title: "Creator studio wide shot", duration: 10, source: "Coverr", keywords: ["studio", "camera", "lights"], hue: 350 },
  { id: "clip-phone", title: "Scrolling a phone in bed", duration: 7, source: "Pexels", keywords: ["phone", "scroll", "mobile"], hue: 310 },
  { id: "clip-whiteboard", title: "Whiteboard brainstorm", duration: 11, source: "Pixabay", keywords: ["whiteboard", "ideas", "team"], hue: 45 },
  { id: "clip-stock", title: "Stock ticker overlay", duration: 8, source: "Coverr", keywords: ["finance", "ticker", "market"], hue: 140 },
  { id: "clip-coffee", title: "Coffee and notebook", duration: 5, source: "Pexels", keywords: ["coffee", "notebook", "morning"], hue: 28 },
  { id: "clip-server", title: "Server rack LEDs", duration: 9, source: "Pixabay", keywords: ["server", "tech", "lights"], hue: 190 },
  { id: "clip-crowd", title: "Conference crowd wide", duration: 13, source: "Coverr", keywords: ["crowd", "conference", "stage"], hue: 8 },
  { id: "clip-nature", title: "Aerial forest morning", duration: 14, source: "Pexels", keywords: ["forest", "aerial", "calm"], hue: 130 },
];

export type MusicTrack = {
  id: string;
  title: string;
  mood: string;
  bpm: number;
  duration: number;
};

export const mockMusicTracks: MusicTrack[] = [
  { id: "music-rising", title: "Rising Up", mood: "Motivational", bpm: 118, duration: 90 },
  { id: "music-night", title: "Night Desk", mood: "Focus", bpm: 92, duration: 120 },
  { id: "music-pulse", title: "Soft Pulse", mood: "Calm", bpm: 80, duration: 75 },
  { id: "music-cut", title: "Hard Cut", mood: "Energetic", bpm: 132, duration: 60 },
  { id: "music-story", title: "Story Arc", mood: "Cinematic", bpm: 96, duration: 150 },
];

export type GenerationType =
  | "titles"
  | "thumbnails"
  | "script"
  | "scenes"
  | "sceneScript"
  | "sceneVisuals"
  | "description"
  | "vidiqTitles"
  | "vidiqThumbnails"
  | "vidiqScript";

export type GenerationInput = {
  titles: { prompt: string; count?: number };
  thumbnails: { prompt: string; count?: number };
  script: { prompt: string; durationSeconds: number; intent?: string };
  scenes: { fullScript: string; prompt: string; style?: "blocks" | "chart" };
  sceneScript: { prompt: string };
  sceneVisuals: { prompt: string };
  description: { prompt: string; title?: string };
  vidiqTitles: { titles: Array<{ id: string; text: string }>; topic?: string };
  vidiqThumbnails: { thumbnails: Array<{ id: string; concept: string }> };
  vidiqScript: { script: string; topic?: string; title?: string; lengthMinutes?: number };
};

export type GenerationOutput = {
  titles: TitleOption[];
  thumbnails: ThumbnailOption[];
  script: string;
  scenes: Scene[];
  sceneScript: string;
  sceneVisuals: { description: string; thumbnailUrl: string };
  description: { description: string; tags: string[] };
  vidiqTitles: Record<string, VidIqTitleInsight>;
  vidiqThumbnails: Record<string, VidIqThumbInsight>;
  vidiqScript: VidIqScriptInsight;
};

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mockLatency() {
  return 800 + Math.floor(Math.random() * 700);
}

function providerTag(provider: AiProvider): string {
  if (provider === "chatgpt") return "GPT";
  if (provider === "gemini") return "Gemini";
  return "11L";
}

function providerFlavor(provider: AiProvider): string {
  if (provider === "chatgpt") return "Drafted with ChatGPT — punchy, hook-first cadence.";
  if (provider === "gemini") return "Drafted with Gemini — structured, research-leaning cadence.";
  return "Drafted with ElevenLabs — written to sit under a spoken read.";
}

const TITLE_TEMPLATES = [
  "The {topic} Playbook Nobody Talks About",
  "I Tested {topic} for 30 Days — Here's What Broke",
  "{topic}: The System Behind the Results",
  "Stop Doing {topic} the Hard Way",
  "How to Run {topic} Without Burning Out",
  "What {topic} Looks Like at 10x Scale",
];

const THUMB_CONCEPTS = [
  "Split screen: overwhelmed creator vs. clean dashboard, bold yellow caption top-left",
  "Face-forward thumbnail with red arrow pointing at a giant view-count number",
  "Dark desk overhead, laptop glowing, 3-word hook in extra-bold white type",
  "Before/after bar chart exploding off the right edge, circle crop of the host",
  "Cinematic studio lights, red accent, title stacked in two lines over bokeh",
  "Phone mockup of a viral comment, shocked emoji, high-contrast background",
];

const SECTION_LABELS = ["Hook", "Intro", "Point 1", "Point 2", "Point 3", "Proof", "CTA", "Outro"];

const VISUAL_BEATS = [
  "Tight shot of a cursor hovering over a publish button, then a smash cut to analytics climbing.",
  "Overhead of a notebook with three circled bullets, matching lower-thirds.",
  "Screen recording of a dashboard, slow zoom, then cut to talking-head B-roll.",
  "Montage of stock city night, then a whiteboard sketch of the system.",
  "Macro of a microphone, then a wide of the studio with caption callouts.",
  "Abstract particle motion in brand red, then a clean kinetic-type card.",
];

function topicFromPrompt(prompt: string): string {
  const line = prompt.split("\n").find((part) => part.trim().length > 0) ?? "this system";
  const cleaned = line.replace(/^(Video topic|Topic|Prompt):\s*/i, "").trim();
  return cleaned.length > 42 ? `${cleaned.slice(0, 39)}…` : cleaned || "this system";
}

function makeTitles(prompt: string, provider: AiProvider, count: number): TitleOption[] {
  const seed = hash(`${provider}:${prompt}`);
  const topic = topicFromPrompt(prompt);
  return Array.from({ length: count }, (_, index) => {
    const template = TITLE_TEMPLATES[(seed + index) % TITLE_TEMPLATES.length] ?? TITLE_TEMPLATES[0];
    const text = `${template.replace("{topic}", topic)} [${providerTag(provider)}]`;
    return { id: newId(), text, provider };
  });
}

function makeThumbnails(prompt: string, provider: AiProvider, count: number): ThumbnailOption[] {
  const seed = hash(`${provider}:thumb:${prompt}`);
  return Array.from({ length: count }, (_, index) => {
    const concept = THUMB_CONCEPTS[(seed + index) % THUMB_CONCEPTS.length] ?? THUMB_CONCEPTS[0];
    return {
      id: newId(),
      concept: `${concept} · ${providerTag(provider)} take`,
      provider,
    };
  });
}

function makeScript(
  prompt: string,
  provider: AiProvider,
  durationSeconds: number,
  intent?: string,
): string {
  const topic = topicFromPrompt(prompt);
  const voice = intent || "educational";
  const lengthPhrase = formatDurationLabel(
    durationSeconds,
    durationSeconds < 120 ? "shorts" : "long-form",
  );
  return [
    `[${providerTag(provider)}] ${providerFlavor(provider)}`,
    "",
    `HOOK (${voice})`,
    `If ${topic} still feels like a second job, this video is the operating system I wish I had on day one.`,
    "",
    "INTRO",
    `In the next ${lengthPhrase} I'll walk the exact pipeline: research, script, voice, footage, and publish — without hiring a 6-person team.`,
    "",
    "POINT 1 — The bottleneck isn't ideas",
    "Most channels stall because every video restarts from a blank page. We lock a video introduction first so every later step inherits the same brief.",
    "",
    "POINT 2 — Generate, then choose",
    "Titles, thumbnails, and scripts are cheap to regenerate. The skill is picking the one that matches the format, not shipping the first draft.",
    "",
    "POINT 3 — Scenes are the real editor",
    "Once the script is locked we break it into scenes with their own voiceover, visual, and duration. That's what Remotion actually renders.",
    "",
    "PROOF",
    "This is the same flow we use internally: mock the AI, keep the draft local, then swap each generator for ChatGPT, Gemini, ElevenLabs, and stock APIs.",
    "",
    "CTA",
    "If you want the template, it's linked below. Duplicate the project, drop in your topic, and run the pipeline once end-to-end.",
    "",
    "OUTRO",
    "That's the system. Next video: how we score titles against historical CTR before we ever render.",
  ].join("\n");
}

function splitIntoScenes(
  fullScript: string,
  prompt: string,
  style: "blocks" | "chart" = "blocks",
): Scene[] {
  if (style === "chart") return splitIntoChart(fullScript, prompt);

  const blocks = fullScript
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0 && !block.startsWith("["));

  const usable = blocks.length >= 4 ? blocks.slice(0, 7) : blocks;
  const count = Math.max(usable.length, 4);
  const scenes: Scene[] = [];

  for (let index = 0; index < count; index += 1) {
    const label = SECTION_LABELS[Math.min(index, SECTION_LABELS.length - 1)] ?? `Scene ${index + 1}`;
    const body = usable[index] ?? `${label}: continue the argument from the previous beat.`;
    const originalPrompt = [
      prompt.trim(),
      `Section: ${label}`,
      `Source beat:\n${body}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const scene = createEmptyScene(index, {
      sectionLabel: label,
      originalPrompt,
      finalScript: body,
    });
    scene.status = "generated";
    scene.visuals.description = VISUAL_BEATS[index % VISUAL_BEATS.length] ?? VISUAL_BEATS[0];
    scene.visuals.thumbnailUrl = sceneVisualImageUrl(scene.visuals.description);
    scene.editing.durationSeconds = 8 + (index % 5) * 2;
    scenes.push(scene);
  }

  return scenes;
}

type ChartBeat = {
  duration: number;
  label: string;
  script: (topic: string) => string;
  visuals: (topic: string) => string;
};

const CHART_BEATS: ChartBeat[] = [
  {
    duration: 25,
    label: "Cold Open — Why You Keep Failing",
    script: (topic) =>
      `Let me guess why you clicked this video. There's probably something you want to change around ${topic}. Maybe you've been telling yourself you'll start for years. → And you've probably tried before. → Monday / first of the month / January 1st → motivation → progress → one missed day → week → month. → What if six months from now, nothing has changed? → What if the problem isn't that you're lazy? What if every plan you've tried was never actually built for you?`,
    visuals: (topic) =>
      `Very fast cuts: alarm → snooze → gym shoes → scrolling → unfinished to-do list → calendar DAY 1. Show a few successful days → tracker suddenly breaks. Slow everything down for "six months from now." Kinetic type over ${topic}.`,
  },
  {
    duration: 50,
    label: "The Experiment / Early Promise",
    script: (topic) =>
      `So here's what I actually did with ${topic}. I mapped my real triggers, my real failures, my real schedule. Then I handed all of that to the pipeline and asked it to build a system around it. → One part worked way better than I expected. Another part completely failed. → Before we go further — write down the one thing you want to change. Just one.`,
    visuals: () =>
      `Book / notes → habit profile → Claude / ChatGPT → AI plan. Rapid DAY 1 → DAY 10 → DAY 20 → DAY 30 flashes. Tease results but don't reveal them. End on a notebook with one blank line.`,
  },
  {
    duration: 30,
    label: "Motivation Isn't the Problem",
    script: () =>
      `We've been taught that successful people just have more discipline, more willpower… → But think about it — how many things have you genuinely wanted and still failed to do? → Maybe the problem isn't wanting it. Maybe the problem is what happens between "I want to change" and actually doing it.`,
    visuals: () =>
      `Talking head + failed habit trackers. Large kinetic text: WANTING TO CHANGE ≠ ACTUALLY CHANGING.`,
  },
  {
    duration: 45,
    label: "Introduce the Experiment",
    script: (topic) =>
      `So today we're doing something different. We're going to take the biggest ideas behind ${topic} and use them to understand your version — not the generic one, yours. → Goals + failures + triggers + environment + identity. → Not to magically fix your life. It can't. → But what if giving it real context let it build a system that actually fits you?`,
    visuals: (topic) =>
      `Visual pipeline: ${topic.toUpperCase()} → YOU → CONTEXT → AI → 30-DAY SYSTEM. Cut between talking head, source material, form, and the model.`,
  },
  {
    duration: 30,
    label: "The Viewer Promise",
    script: () =>
      `If you clicked this because you're tired of watching, feeling motivated for twenty minutes, and going back to exactly the same life — you're in the right place. → By the end you'll have a completed profile of your own habits. And I'll give you the exact prompt to get your own personalized plan.`,
    visuals: () =>
      `Flash finished form → prompt → generated plan. On-screen: BUILD YOUR OWN SYSTEM.`,
  },
  {
    duration: 60,
    label: "Roadmap",
    script: (topic) =>
      `Before we start filling anything in, let me show you where we're going with ${topic}… → First: the foundation. Second: the loop. Third: the rules. Fourth: adapt it to you. Fifth: hand everything to the model. → By the end, you won't just know the idea. You'll have a complete profile of yourself.`,
    visuals: () =>
      `Five blocks build one at a time: ① FOUNDATION → ② LOOP → ③ RULES → ④ ADAPT → ⑤ AI SYSTEM. Preserve this graphic for later.`,
  },
  {
    duration: 30,
    label: "Stop Changing Everything",
    script: () =>
      `We think changing our life means changing everything at once. → Perfect self on Monday → fail one thing → everything feels failed. → So we're doing the opposite. One problem. One direction. Thirty days. → Why does this actually matter to me?`,
    visuals: () =>
      `DIET / WORKOUT / 5AM / READ / MONEY / NO PHONE / MEDITATE pile onto screen → collapse. One remains. Huge: ONE PROBLEM. ONE DIRECTION. 30 DAYS.`,
  },
  {
    duration: 30,
    label: "Small Habits Compound",
    script: () =>
      `This idea sounds almost too simple: small habits compound. → Two people make slightly different choices repeatedly → initially no visible difference. → And that's the dangerous part — when results are invisible, we assume our actions aren't working. → What if the biggest changes happen during the stretch where it looks like nothing is happening?`,
    visuals: () =>
      `Two-person split screen. Nearly identical beginning → trajectories slowly separate. Small daily actions → compounding curve. On-screen: WHAT DOES 1% BETTER LOOK LIKE?`,
  },
  {
    duration: 45,
    label: "Goals vs Systems",
    script: () =>
      `Almost everyone wants to be healthier. Almost everyone wants more money. If wanting the goal was enough, wouldn't everyone succeed? → Goals describe where you want to go. Habits decide what happens on a random Tuesday. → Goal / repeated action / what stops me.`,
    visuals: () =>
      `Big card: GOAL: LOSE WEIGHT → clock hits 8:30 PM → actual choice appears. GOAL = WHERE / SYSTEM = WHAT HAPPENS TODAY.`,
  },
  {
    duration: 45,
    label: "Identity-Based Habits",
    script: () =>
      `Outcome — what do I want? Process — what do I repeatedly do? Identity — who do I believe I am? → Most of us change outside-in… → I'm becoming a healthy person — what would that person do today? → Smallest proof action.`,
    visuals: () =>
      `Three concentric layers: OUTCOME → PROCESS → IDENTITY. "I'm lazy" / "bad with money" appear → cross out → I'M BECOMING SOMEONE WHO…`,
  },
  {
    duration: 60,
    label: "The Loop",
    script: (topic) =>
      `Before we build a new habit around ${topic}, we need to understand the old one. → CUE → CRAVING → RESPONSE → REWARD. → Working → bored → stimulation → phone → interesting content → repeat. → Identify what happens before the bad habit and what you're actually seeking.`,
    visuals: () =>
      `Animated loop. Recreate the phone example visually. Then overlay a simple daily scorecard.`,
  },
  {
    duration: 45,
    label: "STEP 1 — Make It Obvious",
    script: () =>
      `Think about the habit you keep promising yourself you'll do. Can you tell me exactly when you're supposed to do it tomorrow — not roughly, exactly? → Pause. → If you can't answer that in one second, that's the problem. → I will ___ at ___ in ___. → Habit stacking: After I ___, I will ___. → You might not have a discipline problem. You might have a room problem.`,
    visuals: () =>
      `Huge STEP 1. Clock + calendar + location. Animate formula. Coffee → new habit. Phone visible → phone removed. Gym shoes hidden → shoes beside door.`,
  },
  {
    duration: 45,
    label: "STEP 2 — Make It Attractive",
    script: () =>
      `Okay — so now you know exactly when and where. Be honest: does that alone make you actually want to do it? → Your brain still has to want to do it. → Anticipation → temptation bundling → social influence → identify the real cost of the bad habit.`,
    visuals: () =>
      `STEP 2. Two cards: SOMETHING I ENJOY + SOMETHING I NEED TO DO → COMBINE THEM. Social/community montage. Cost counter for the bad habit: TIME / MONEY / ENERGY.`,
  },
];

function splitIntoChart(fullScript: string, prompt: string): Scene[] {
  const topic = topicFromPrompt(prompt);
  const scriptBlocks = fullScript
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0 && !block.startsWith("["));

  return CHART_BEATS.map((beat, index) => {
    const fromScript = scriptBlocks[index];
    const finalScript = fromScript
      ? `${fromScript}${fromScript.includes("→") ? "" : " → Hold the beat, then hand off."}`
      : beat.script(topic);
    const originalPrompt = [
      prompt.trim(),
      `Section: ${beat.label}`,
      `Chart row ${index + 1}`,
      `Source beat:\n${finalScript}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const scene = createEmptyScene(index, {
      sectionLabel: beat.label,
      originalPrompt,
      finalScript,
    });
    scene.status = "generated";
    scene.visuals.description = beat.visuals(topic);
    scene.visuals.thumbnailUrl = sceneVisualImageUrl(scene.visuals.description);
    scene.editing.durationSeconds = beat.duration;
    scene.editing.notes = `Keep this beat inside ${beat.duration}s. Cut on the arrows.`;
    return scene;
  });
}

function gradeFromScore(score: number): VidIqTitleInsight["grade"] {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "D";
}

function scoreTitleInsight(text: string, topic?: string): VidIqTitleInsight {
  const seed = hash(`vidiq:title:${text}`);
  const lengthBonus = text.length >= 40 && text.length <= 70 ? 12 : text.length < 28 ? -8 : 0;
  const numberBonus = /\d/.test(text) ? 8 : 0;
  const howBonus = /how|why|stop|secret|tested/i.test(text) ? 7 : 0;
  const raw = 48 + (seed % 37) + lengthBonus + numberBonus + howBonus;
  const score = Math.max(32, Math.min(96, raw));
  const competition: VidIqTitleInsight["competition"] =
    score >= 78 ? "High" : score >= 58 ? "Medium" : "Low";
  const volumeK = 4 + (seed % 48);
  const keywords = [
    topic?.split(" ").slice(0, 3).join(" ") || "youtube growth",
    "faceless channel",
    score >= 70 ? "how to" : "beginner",
    /\d/.test(text) ? "30 days" : "system",
  ].filter(Boolean);

  return {
    score,
    grade: gradeFromScore(score),
    volume: `${volumeK}.${seed % 9}K`,
    competition,
    keywords,
    predictedCtr: Number((2.1 + (score - 40) / 18).toFixed(1)),
  };
}

function scoreThumbInsight(concept: string): VidIqThumbInsight {
  const seed = hash(`vidiq:thumb:${concept}`);
  const facePresent = /face|host|circle crop/i.test(concept);
  const textDensity: VidIqThumbInsight["textDensity"] = /caption|title|type|text|hook/i.test(
    concept,
  )
    ? "High"
    : /arrow|number|chart/i.test(concept)
      ? "Medium"
      : "Low";
  const contrast = 55 + (seed % 40);
  const ctr = Number((4.2 + (seed % 28) / 10 + (facePresent ? 1.4 : 0)).toFixed(1));
  const grade = ctr >= 7.2 ? "A" : ctr >= 5.8 ? "B" : ctr >= 4.6 ? "C" : "D";
  return {
    ctr,
    grade,
    contrast,
    textDensity,
    facePresent,
    notes: facePresent
      ? "Face + high-contrast hook is carrying CTR in this mock."
      : "Add a face or a 3-word hook — mock VidIQ flags low emotion.",
  };
}

function scoreTitles(
  titles: Array<{ id: string; text: string }>,
  topic?: string,
): Record<string, VidIqTitleInsight> {
  return Object.fromEntries(
    titles.map((title) => [title.id, scoreTitleInsight(title.text, topic)]),
  );
}

function scoreThumbnails(
  thumbnails: Array<{ id: string; concept: string }>,
): Record<string, VidIqThumbInsight> {
  return Object.fromEntries(
    thumbnails.map((thumb) => [thumb.id, scoreThumbInsight(thumb.concept)]),
  );
}

function scoreScriptInsight(
  script: string,
  topic?: string,
  title?: string,
  lengthMinutes?: number,
): VidIqScriptInsight {
  const seed = hash(`vidiq:script:${script}`);
  const words = script.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const spokenMinutes = Number((wordCount / 140).toFixed(1));
  const target = lengthMinutes ?? 8;
  const lengthFit = Math.max(0, 20 - Math.abs(spokenMinutes - target) * 4);
  const hookBonus = /let me guess|hook|clicked|what if|stop/i.test(script.slice(0, 400)) ? 14 : 0;
  const ctaBonus = /subscribe|comment|link below|write down|your turn/i.test(script) ? 12 : 0;
  const loopBonus = /→|cue|craving|reward|system/i.test(script) ? 8 : 0;
  const hook = Math.max(28, Math.min(96, 50 + (seed % 22) + hookBonus));
  const retention = Math.max(30, Math.min(95, 46 + (seed % 28) + loopBonus + Math.round(lengthFit)));
  const keywordFit = Math.max(
    32,
    Math.min(94, 44 + (seed % 25) + (topic && script.toLowerCase().includes(topic.toLowerCase().slice(0, 12)) ? 14 : 0)),
  );
  const cta = Math.max(24, Math.min(92, 40 + (seed % 20) + ctaBonus));
  const score = Math.round((hook * 0.3 + retention * 0.3 + keywordFit * 0.25 + cta * 0.15));
  const notes = [
    hook < 60 ? "Open with a sharper pattern interrupt in the first 8 seconds." : "Hook is carrying early retention.",
    retention < 65 ? "Add a mid-video promise or pattern interrupt around the 40% mark." : "Pacing looks strong for a sit-through.",
    cta < 55 ? "The closer is soft — name one concrete action before the outro." : "CTA is specific enough to convert.",
    spokenMinutes < target * 0.7
      ? `Spoken length ~${spokenMinutes}m vs a ${target}m target — you may be short.`
      : spokenMinutes > target * 1.25
        ? `Spoken length ~${spokenMinutes}m vs a ${target}m target — consider cutting a beat.`
        : `Spoken length ~${spokenMinutes}m is in range for a ${target}m video.`,
  ];
  const keywords = [
    topic?.split(" ").slice(0, 3).join(" ") || "youtube script",
    title?.split(" ").slice(0, 2).join(" ") || "retention",
    "hook",
    cta >= 60 ? "call to action" : "watch time",
  ].filter(Boolean);

  return {
    score: Math.max(34, Math.min(96, score)),
    grade: gradeFromScore(score),
    hook,
    retention,
    keywordFit,
    cta,
    wordCount,
    spokenMinutes,
    keywords,
    notes,
    sourceHash: String(seed),
  };
}

function makeSceneScript(prompt: string, provider: AiProvider): string {
  const topic = topicFromPrompt(prompt);
  return [
    `[${providerTag(provider)} rewrite]`,
    `Stay on this beat: ${topic}.`,
    "Open with a concrete image, land one claim, then hand off to the next scene without a goodbye.",
  ].join("\n");
}

function makeVisual(prompt: string, provider: AiProvider): { description: string; thumbnailUrl: string } {
  const seed = hash(`${provider}:vis:${prompt}`);
  const beat = VISUAL_BEATS[seed % VISUAL_BEATS.length] ?? VISUAL_BEATS[0];
  const description = `[${providerTag(provider)}] ${beat}`;
  return { description, thumbnailUrl: sceneVisualImageUrl(description) };
}

function makeDescription(
  prompt: string,
  provider: AiProvider,
  title?: string,
): { description: string; tags: string[] } {
  const topic = topicFromPrompt(prompt);
  const headline = title || topic;
  const description = [
    `[${providerTag(provider)}] ${providerFlavor(provider)}`,
    "",
    headline,
    "",
    `In this video we unpack ${topic} as a repeatable pipeline — from a one-page brief to a Remotion render.`,
    "",
    "Chapters",
    "00:00 Hook",
    "00:18 The real bottleneck",
    "01:40 Generate then choose",
    "03:10 Scene-level editing",
    "05:00 What to do next",
    "",
    "Tools mentioned: ChatGPT, Gemini, ElevenLabs, Remotion.",
    "",
    "#youtube #faceless #contentops",
  ].join("\n");

  const tags = [
    "youtube growth",
    "faceless channel",
    topic.toLowerCase(),
    "content system",
    "ai video",
    provider === "gemini" ? "gemini workflow" : "chatgpt workflow",
  ];

  return { description, tags };
}

export async function mockGenerate<T extends GenerationType>(
  type: T,
  input: GenerationInput[T],
  provider: AiProvider,
): Promise<GenerationOutput[T]> {
  await delay(mockLatency());

  switch (type) {
    case "titles": {
      // TODO: replace with real API call
      const { prompt, count = 5 } = input as GenerationInput["titles"];
      return makeTitles(prompt, provider, Math.min(Math.max(count, 4), 6)) as GenerationOutput[T];
    }
    case "thumbnails": {
      // TODO: replace with real API call
      const { prompt, count = 4 } = input as GenerationInput["thumbnails"];
      return makeThumbnails(prompt, provider, Math.min(Math.max(count, 4), 6)) as GenerationOutput[T];
    }
    case "script": {
      // TODO: replace with real API call
      const { prompt, durationSeconds, intent } = input as GenerationInput["script"];
      return makeScript(prompt, provider, durationSeconds, intent) as GenerationOutput[T];
    }
    case "scenes": {
      // TODO: replace with real API call
      const { fullScript, prompt, style } = input as GenerationInput["scenes"];
      return splitIntoScenes(fullScript, prompt, style) as GenerationOutput[T];
    }
    case "sceneScript": {
      // TODO: replace with real API call
      const { prompt } = input as GenerationInput["sceneScript"];
      return makeSceneScript(prompt, provider) as GenerationOutput[T];
    }
    case "sceneVisuals": {
      // TODO: replace with real API call
      const { prompt } = input as GenerationInput["sceneVisuals"];
      return makeVisual(prompt, provider) as GenerationOutput[T];
    }
    case "description": {
      // TODO: replace with real API call
      const { prompt, title } = input as GenerationInput["description"];
      return makeDescription(prompt, provider, title) as GenerationOutput[T];
    }
    case "vidiqTitles": {
      // TODO: replace with real VidIQ title scoring API
      const { titles, topic } = input as GenerationInput["vidiqTitles"];
      return scoreTitles(titles, topic) as GenerationOutput[T];
    }
    case "vidiqThumbnails": {
      // TODO: replace with real VidIQ thumbnail CTR API
      const { thumbnails } = input as GenerationInput["vidiqThumbnails"];
      return scoreThumbnails(thumbnails) as GenerationOutput[T];
    }
    case "vidiqScript": {
      // TODO: replace with real VidIQ script scoring API
      const { script, topic, title, lengthMinutes } = input as GenerationInput["vidiqScript"];
      return scoreScriptInsight(script, topic, title, lengthMinutes) as GenerationOutput[T];
    }
    default: {
      const exhaustive: never = type;
      throw new Error(`Unknown generation type: ${exhaustive}`);
    }
  }
}

export function scriptScoreHash(script: string): string {
  return String(hash(`vidiq:script:${script}`));
}

export function summaryPrompt(input: VideoSummary): string {
  const references = input.references
    .filter((item) => item.url.trim() || item.transcript.trim())
    .map((item, index) => {
      const heading = `Reference ${index + 1}: ${item.url.trim() || "(no link)"}`;
      return item.transcript.trim()
        ? `${heading}\nTranscript:\n${item.transcript.trim()}`
        : heading;
    })
    .join("\n\n");
  return [
    `Topic: ${input.topic}`,
    `Format: ${FORMAT_LABELS[input.format]} (${input.aspectRatio})`,
    `Intent: ${INTENT_LABELS[input.intent]}`,
    `Length: ${formatDurationLabel(input.durationSeconds, input.format)}`,
    references ? `Reference videos:\n${references}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
