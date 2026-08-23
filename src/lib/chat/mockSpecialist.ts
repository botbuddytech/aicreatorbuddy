import { getPageContext } from "@/lib/chat/pageContext";
import type { ChatMessage } from "@/lib/chat/types";
import { demoAuth } from "@/lib/dashboardContent";

type IntentId =
  | "niche"
  | "hook"
  | "thumbnail"
  | "script"
  | "retention"
  | "pipeline"
  | "pricing"
  | "login"
  | "rpm"
  | "ads"
  | "schedule"
  | "channels"
  | "faceless"
  | "seo"
  | "identity"
  | "next"
  | "shorts"
  | "voice"
  | "offtopic";

type Intent = {
  id: IntentId;
  keywords: string[];
};

const INTENTS: Intent[] = [
  { id: "identity", keywords: ["who are you", "what are you", "your name", "are you ai", "are you a bot"] },
  { id: "login", keywords: ["login", "sign in", "password", "demo@", "demo1234", "access", "log in"] },
  { id: "pricing", keywords: ["pric", "plan", "starter", "growth", "scale", "cost", "how much", "$20", "$100", "$300", "subscribe"] },
  { id: "pipeline", keywords: ["pipeline", "how it work", "how does", "steps", "workflow", "elevenlabs", "seedance", "remotion", "create video"] },
  { id: "voice", keywords: ["voice", "voiceover", "eleven", "narrat", "tts"] },
  { id: "niche", keywords: ["niche", "what should i post", "topic", "ideas", "faceless niche", "what to make"] },
  { id: "hook", keywords: ["hook", "intro", "first 8", "first 15", "open cold"] },
  { id: "thumbnail", keywords: ["thumbnail", "ctr", "packaging", "title", "click"] },
  { id: "script", keywords: ["script", "write", "draft", "voiceover script"] },
  { id: "retention", keywords: ["retention", "avd", "watch time", "drop off", "keep watching"] },
  { id: "rpm", keywords: ["rpm", "cpm", "monetiz", "revenue", "earn", "money", "adsense"] },
  { id: "ads", keywords: ["ad format", "mid-roll", "midroll", "bumper", "skippable", "shorts ads"] },
  { id: "schedule", keywords: ["schedul", "cadence", "best time", "when to post", "calendar", "how often"] },
  { id: "channels", keywords: ["channel", "portfolio", "multi-channel", "growth lab", "nextwave"] },
  { id: "faceless", keywords: ["faceless", "no face", "no camera", "on camera"] },
  { id: "seo", keywords: ["seo", "vidiq", "tags", "description", "search"] },
  { id: "shorts", keywords: ["short", "shorts", "vertical", "60 second"] },
  { id: "next", keywords: ["next", "what should i do", "stuck", "help me", "start"] },
  { id: "offtopic", keywords: ["weather", "recipe", "homework", "capital of", "write python", "leetcode"] },
];

function normalize(text: string) {
  return text.toLowerCase().replace(/[_*#]/g, " ");
}

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function scoreIntent(blob: string, intent: Intent) {
  let score = 0;
  for (const keyword of intent.keywords) {
    if (blob.includes(keyword)) score += keyword.length > 8 ? 3 : 2;
  }
  return score;
}

function pickIntent(blob: string, pathname: string): IntentId {
  let best: IntentId = "next";
  let bestScore = 0;
  for (const intent of INTENTS) {
    const score = scoreIntent(blob, intent);
    if (score > bestScore) {
      best = intent.id;
      bestScore = score;
    }
  }

  if (bestScore === 0) {
    if (pathname.includes("rpm")) return "rpm";
    if (pathname.includes("ad-format")) return "ads";
    if (pathname.includes("create")) return "script";
    if (pathname.includes("scheduler")) return "schedule";
    if (pathname.includes("login")) return "login";
    if (pathname === "/" || !pathname.startsWith("/dashboard")) return "pipeline";
  }

  return best;
}

function replies(id: IntentId, pathname: string, variant: number): string {
  const ctx = getPageContext(pathname);
  const v = variant % 2;

  switch (id) {
    case "identity":
      return v === 0
        ? "I'm **Buddy** — the YouTube specialist sitting inside AI Creator Buddy. I think in hooks, packaging, retention, and faceless systems, and I can see which screen you're on so the advice matches the work.\n\nWhat are you trying to move — a first video, CTR, or cadence?"
        : "Buddy. In-app YouTube operator, not a generic helpdesk. Faceless workflow, packaging, RPM, posting rhythm — that's my lane.\n\nWant a niche, a hook, or a walkthrough of the pipeline?";
    case "login":
      return `Demo door: **${demoAuth.email}** / **${demoAuth.password}**. That drops you into the multi-channel workspace — create pipeline, library, scheduler, analytics.\n\nIt's a product demo, so publish won't hit a live YouTube account. Want me to tell you what to click first after you're in?`;
    case "pricing":
      return v === 0
        ? "Three lanes:\n- **Starter $20/mo** — BYOK, one channel, full pipeline. Good if you already pay OpenAI / ElevenLabs yourself.\n- **Growth $100/mo** — up to 5 channels, 100 minutes/month. The one I'd start a small portfolio on.\n- **Scale $300/mo** — unlimited channels, 500 minutes, seats, white-label.\n\nIf you're testing the idea this week, log into the demo and run one video through Create before you pick a plan. What's your channel count?"
        : "If you already have AI keys, **Starter** is honest. If you're about to run more than one niche channel, **Growth** is the actual product. **Scale** is for agencies who need seats and client-looking reports.\n\nThis demo doesn't charge a card — poke around, then decide. Are you solo or running client channels?";
    case "pipeline":
      return "The faceless line is six locked steps, each with edit + preview — nothing auto-publishes:\n1. Script (ChatGPT / Gemini)\n2. Voice (ElevenLabs)\n3. Scenes (Seedance)\n4. Edit & render (Remotion)\n5. Packaging / SEO (VidIQ)\n6. Publish to a connected channel\n\nAfter login, that's **Create Video**. Most people stall on step 1 by writing a lecture. Start with a 15-second hook, then three proofs, then a CTA. Want me to outline a first video?";
    case "voice":
      return "Voice is the product on a faceless channel. In this workspace that's **ElevenLabs** on step 2: generate, preview against the script, then lock. Don't pick the flashiest voice — pick one you can live with for 50 episodes.\n\nPacing: a hair slower than you think, hard cuts on the visual, never let the VO apologize. Want a read-style (calm explainer vs punchy listicle)?";
    case "niche":
      return v === 0
        ? "Don't pick 'make videos about everything.' Faceless compounds when one audience can sit through 50 episodes.\n\nThree lanes that still work: **calm visual + smart VO** (history, geo, tech explainers), **hard-cut listicles** (money, tools, mistakes), **story-time** (Reddit / case-study narrative with stock).\n\nConstraint check: is your bottleneck research, or being on camera? Faceless only kills the second one. Which of those three could you outline in 20 minutes?"
        : "A niche is an audience + a promise, not a topic. 'Personal finance for burned-out 9–5s' beats 'finance.' 'Obscure history for people who liked Extra Credits' beats 'history.'\n\nOnce you can write 20 titles without repeating yourself, you've got a niche. Want me to pressure-test one you're considering?";
    case "hook":
      return "The first 8–15 seconds are a contract. Pattern that works for faceless:\n1. A specific tension ('Most faceless channels die in month two — here's the exact reason')\n2. A proof glimpse (number, before/after, forbidden tactic)\n3. The map ('I'll show the 3-part system')\n\nKill greetings, kill 'hey guys,' kill stock footage of Earth spinning. If you're in Create, write the hook as its own beat before the rest of the script. What's the video actually about?";
    case "thumbnail":
      return "CTR is packaging, not luck. One idea per thumbnail, readable at phone size, high contrast, 3–5 words max on the image. Title and thumbnail should **complete** each other, not repeat.\n\nFormula I like: curiosity gap in the title + a visual 'object of desire or pain' on the thumb. Face helps but faceless can win with diagrams, big numbers, and a red-circle cliché used sparingly.\n\nIn Create, generate a few titles, then force the thumbnail to argue with the winner. Want me to riff packaging on your topic?";
    case "script":
      return ctx.pathname.startsWith("/dashboard/create")
        ? "You're already in Create — treat the script as a retention machine, not an essay.\n\nShape: Hook (0:00–0:12) → promise → 3 labeled beats → proof or example each → cold CTA. Open loops at the end of beat 1 and 2 so they can't leave. Target spoken words: ~140/min.\n\nPaste your topic (or the draft) and I'll cut a tighter hook + beat list."
        : "A YouTube script isn't a blog post. It's a spoken retention curve: hook, labeled beats, pattern interrupts every 20–40s (visual change, number, 'but here's the part nobody says').\n\nAfter login, **Create Video** will draft it. If you want it here first, give me the topic and duration.";
    case "retention":
      return "Retention dies in three places: a weak hook, a slow middle, and a visual that doesn't change. Fix in that order.\n\nPractical: new visual or on-screen label every 20–40 seconds, no 90-second 'context,' say the interesting sentence first. If AVD is fine but CTR is low, that's packaging — don't rewrite the whole script.\n\nWant to look at a specific drop-off (intro vs mid-video)?";
    case "rpm":
      return "RPM is what *you* take home per thousand views. CPM is what advertisers bid. They diverge when the ad mix, geo, or length changes.\n\nTo lift RPM without praying: longer videos that honestly earn mid-rolls (~8 min+), topics advertisers like (finance, software, education vs pure commentary), and an audience in higher-CPM geos. Shorts RPM is a different, usually thinner game.\n\nYou're " +
        (ctx.pathname.includes("rpm") ? "on the RPM / CPM screen — read mix shifts before you panic at one bad day." : "not on the analytics RPM view yet; it's under Monetization → RPM / CPM Insights.") +
        "\n\nIs the drop happening on long-form, Shorts, or both?";
    case "ads":
      return "In-stream skippable + mid-rolls usually pay the rent. Bumpers and overlays are spare change. Shorts feed ads exist but RPM is typically much lower — treat Shorts as distribution, long-form as the store.\n\nIf you want ad-mix to look like a real channel, you need length and a topic brands will bid on. The **Ad Formats** page in Monetization is the demo's breakdown.\n\nAre you trying to design videos for mid-rolls, or chasing Shorts reach?";
    case "schedule":
      return v === 0
        ? "Cadence beats a perfect hour. For faceless long-form, a schedule you can keep for 90 days — often **2–3 videos / week** — outperforms a daily sprint then silence. Shorts can sit on top of that, not instead of it.\n\nUse **Best Time To Post** as a starting slot for the primary audience, then stop moving the clock every week. Consistency trains the algorithm and you.\n\nWhat's realistic for production: 1 long per week, or 3?"
        : "Post when *your* audience is wandering YouTube, then ignore the myth that 2:01pm Tuesday is magic. The scheduler heatmap is a hint.\n\nBatch: script 3, voice 3, render 3, then drip them. That's how faceless stays sane. Want a weekly template?";
    case "channels":
      return "One niche per channel. Mixing 'calm history' and 'loud crypto' on the same feed trains nobody.\n\nIn this workspace you've got **Growth Lab**, **Viral Cuts**, **Studio Core** connected, **NextWave** still off. Use separate channels for separate promises; share the pipeline, not the audience.\n\nDon't connect a channel until the niche and 10-title backlog exist. Which brand is the priority?";
    case "faceless":
      return "Faceless isn't lazy — it's a production system. You still need a researcher/writer brain, a voice that fits, visuals that change, and packaging that clicks. You just skip lighting a face.\n\nIt wins when the *idea* is the star (lists, explainers, stories). It loses when the channel needed a person (vlog, commentary personality) and you stripped that without replacing the charisma with craft.\n\nWant a first-10-video plan for a faceless lane?";
    case "seo":
      return "YouTube SEO is packaging + session value, not stuffing 30 tags. Title for the click the thumbnail doesn't already make. Description: first two lines are a second hook; tags are hints, not a strategy.\n\nVidIQ in this pipeline scores titles, thumbs, and scripts before you publish — use it as a second opinion, not a religion. Search works for evergreen explainers; a lot of faceless still lives or dies on Suggested / browse.\n\nGot a title you want me to tear apart?";
    case "shorts":
      return "Shorts are a top-of-funnel, not a business model for most faceless shops. Use them to test hooks and siphon to long-form. RPM is usually thinner; looping and first-frame packaging matter more than tags.\n\nDon't clone a 12-minute script into 58 seconds. One punchline, one visual idea, end on a loop or a 'full story on the channel' if you've earned it.\n\nAre you using Shorts to grow a long-form channel, or trying to live there?";
    case "offtopic":
      return "I live in YouTube-land — packaging, retention, faceless systems, this workspace. If you want a channel plan, a hook, or help on the screen you're on, I'm in.\n\nWhat's the video or metric you're actually trying to move?";
    case "next":
    default:
      if (ctx.surface === "login") {
        return "Sign in with the demo (`demo@aicreatorbuddy.app` / `demo1234`), then go **Create Video** and run one idea through the six steps so the rest of the dashboard means something.\n\nWant the niche first, or jump straight in?";
      }
      if (ctx.surface === "marketing") {
        return "Fastest path: pick a faceless niche you can outline 20 titles for, log into the demo, and run **one** video through Create so you see script → voice → scenes → package.\n\nIf you want, I'll pick a niche with you right now — what's a topic you could talk about without Googling every sentence?";
      }
      return `You're on **${ctx.title}**. ${ctx.summary.split(".").slice(0, 2).join(".").trim()}.\n\nIf I had the wheel: don't reorganize the whole channel — pick one video, tighten the hook and packaging, and ship. Tell me the topic (or the metric that looks wrong) and I'll go specific.`;
  }
}

export function mockSpecialistReply(input: { messages: ChatMessage[]; pathname: string }) {
  const users = input.messages.filter((message) => message.role === "user");
  const last = users.at(-1)?.content ?? "";
  const prior = users.at(-2)?.content ?? "";
  const blob = normalize(`${prior} ${last}`);
  const intent = pickIntent(blob, input.pathname);
  const variant = hash(`${intent}:${last}`) % 2;
  return replies(intent, input.pathname, variant);
}
