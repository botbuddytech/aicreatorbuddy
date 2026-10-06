import type { SDKCustomTool, SDKJsonValue } from "@cursor/sdk";
import type { AgentContextPayload, ProjectChange } from "@/lib/agent/types";
import { blocked } from "@/features/cursor-sdk-agent/server/blockers";
import { projectChangeFromTool } from "@/features/cursor-sdk-agent/server/changes";
import { scriptFixNotice } from "@/features/cursor-script-generator/contract";
import { getEffectiveCursorPrompts } from "@/features/cursor-title-generator/repo";
import {
  generateScriptWithCursor,
  generateThumbnailPromptsWithCursor,
  generateTitlesWithCursor,
  generateVisualPromptsWithCursor,
  scoreTitlesWithCursor,
} from "@/features/cursor-title-generator/server/runCursorAgent";
import {
  checkScriptLowEffortWithCursor,
  scoreScriptWithCursor,
} from "@/features/cursor-script-analysis/server/runCursorScriptAnalysis";
import { prisma } from "@/lib/db";
import { isDeletedVideoSession } from "@/lib/session/deletion";
import { isThumbnailId } from "@/lib/storage/thumbnails";
import { callVidiqTool } from "@/lib/vidiq/client";
import { generateVidiqThumbnailImage } from "@/lib/vidiq/generateThumbnailImage";
import { insightFromThumbnailScore, thumbnailScoreFromResult } from "@/lib/vidiq/scoreThumbnail";
import { thumbnailImageDataUri } from "@/lib/vidiq/thumbnailImageData";
import { mockGenerate } from "@/lib/mockAi";
import {
  FORMAT_LABELS,
  INTENT_LABELS,
  MAX_REFERENCES,
  aspectForFormat,
  formatDurationLabel,
} from "@/lib/videoProject";
import type { VisualPromptScene } from "@/features/cursor-visual-prompts/contract";
import { isVisualStyleId } from "@/lib/visualStyles";
import {
  fetchReferenceTranscript,
  fetchYoutubeVideoTitle,
  parseYoutubeVideoId,
} from "@/lib/youtube/transcript";

type ProposalSlot = {
  context: AgentContextPayload;
  proposals: Map<string, ProjectChange>;
  blockers: Map<string, string>;
  userId: string;
};

const PROPOSED = "Proposed. The user accepts or rejects this in the panel. It is not applied yet.";

function namedProvider(value: unknown): "chatgpt" | "gemini" | "vidiq" | null {
  return value === "chatgpt" || value === "gemini" || value === "vidiq" ? value : null;
}

function cursorContext(slot: ProposalSlot) {
  const context = slot.context;
  return {
    topic: context.brief.trim().slice(0, 500),
    format: `${FORMAT_LABELS[context.format]} (${aspectForFormat(context.format)})`.slice(0, 100),
    intent: INTENT_LABELS[context.intent].slice(0, 100),
    duration: formatDurationLabel(context.durationSeconds, context.format).slice(0, 100),
  };
}

function toolError(message: string, slot?: ProposalSlot, toolCallId?: string) {
  if (slot && toolCallId) slot.blockers.set(toolCallId, message);
  return { isError: true as const, content: [{ type: "text" as const, text: message }] };
}

async function proposeGenerated(
  slot: ProposalSlot,
  toolCallId: string | undefined,
  tool: string,
  args: Record<string, unknown>,
  success: string,
) {
  const id = toolCallId || tool;
  const change = projectChangeFromTool(tool, args, slot.context, id);
  if (!change || !toolCallId) return toolError("Could not prepare that change.", slot, toolCallId);
  slot.proposals.set(toolCallId, change);
  return success;
}

function titlesFromVidiq(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const result = value as Record<string, unknown>;
  const candidates = Array.isArray(result.titles)
    ? result.titles
    : Array.isArray(result.suggestions)
      ? result.suggestions
      : [];
  const titles: string[] = [];
  for (const candidate of candidates) {
    const text =
      typeof candidate === "string"
        ? candidate
        : candidate && typeof candidate === "object"
          ? String((candidate as Record<string, unknown>).title ?? (candidate as Record<string, unknown>).text ?? "")
          : "";
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized) titles.push(normalized);
    if (titles.length >= 12) break;
  }
  return titles;
}

function scoreFromVidiq(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const result = value as Record<string, unknown>;
  for (const candidate of [
    result.score,
    result.titleScore,
    (result.result as Record<string, unknown> | undefined)?.score,
    (result.data as Record<string, unknown> | undefined)?.score,
  ]) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return Math.max(0, Math.min(100, Math.round(candidate)));
    }
  }
  return null;
}

async function loadTitles(
  slot: ProposalSlot,
  provider: "cursor" | "chatgpt" | "gemini" | "vidiq",
): Promise<{ titles: string[]; cursorPrompt: string | null }> {
  const context = slot.context;
  if (provider === "cursor") {
    const prompts = await getEffectiveCursorPrompts(slot.userId);
    const result = await generateTitlesWithCursor(prompts.titleGeneration, {
      context: {
        topic: context.brief.trim().slice(0, 500),
        format: `${FORMAT_LABELS[context.format]} (${aspectForFormat(context.format)})`.slice(0, 100),
        intent: INTENT_LABELS[context.intent].slice(0, 100),
        duration: formatDurationLabel(context.durationSeconds, context.format).slice(0, 100),
      },
      referenceTitles: context.references.map((item) => item.title).filter(Boolean).slice(0, 5),
      referenceTranscripts: context.references
        .map((item) => item.transcript.trim())
        .filter(Boolean)
        .slice(0, 5)
        .map((transcript) => transcript.slice(0, 8000)),
    });
    return { titles: result.titles, cursorPrompt: result.promptUsed };
  }
  if (provider === "vidiq") {
    const summary = [
      `Topic: ${context.brief.trim()}`,
      `Format: ${FORMAT_LABELS[context.format]}`,
      `Intent: ${INTENT_LABELS[context.intent]}`,
      `Duration: ${formatDurationLabel(context.durationSeconds, context.format)}`,
    ].join("\n");
    const result = await callVidiqTool<unknown>(
      slot.userId,
      "vidiq_generate_titles",
      {
        title: context.brief.trim(),
        description: summary,
        analysisSummary: summary,
        numTitles: 5,
        type: context.format === "shorts" ? "short" : "long",
      },
      { sessionId: context.projectId || undefined },
    );
    const titles = titlesFromVidiq(result);
    if (titles.length === 0) throw new Error("vidIQ could not generate titles.");
    return { titles, cursorPrompt: null };
  }
  const mocked = await mockGenerate("titles", { prompt: context.brief.trim(), count: 5 }, provider);
  return { titles: mocked.map((item) => item.text), cursorPrompt: null };
}

function objectSchema(
  properties: Record<string, SDKJsonValue>,
  required: string[],
): Record<string, SDKJsonValue> {
  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

function propose(slot: ProposalSlot, name: string, args: Record<string, unknown>, toolCallId?: string): string {
  const id = toolCallId || name;
  const change = projectChangeFromTool(name, args, slot.context, id);
  if (!change) return `Could not propose ${name}. Check the arguments.`;
  if (toolCallId) slot.proposals.set(toolCallId, change);
  return PROPOSED;
}

export function createProjectTools(slot: ProposalSlot): Record<string, SDKCustomTool> {
  const stop = (toolCallId: string | undefined, message: string) => toolError(message, slot, toolCallId);
  const tool = (
    name: string,
    description: string,
    inputSchema: Record<string, SDKJsonValue>,
  ): SDKCustomTool => ({
    description,
    inputSchema,
    execute(args, context) {
      return propose(slot, name, args, context.toolCallId);
    },
  });

  return {
    setBrief: tool(
      "setBrief",
      "Propose a new video brief topic. The user must accept it.",
      objectSchema({ topic: { type: "string", description: "Video topic" } }, ["topic"]),
    ),
    generateTitles: {
      description:
        "Generate title options for this video. Always use Cursor. Only pass provider if the user explicitly asked for chatgpt, gemini, or vidiq. Do not write the titles yourself.",
      inputSchema: objectSchema(
        {
          provider: {
            type: "string",
            description: "Omit this. Set only when the user named chatgpt, gemini, or vidiq.",
          },
        },
        [],
      ),
      async execute(args, context) {
        const named = args.provider;
        const provider =
          named === "chatgpt" || named === "gemini" || named === "vidiq" ? named : "cursor";
        const topic = slot.context.brief.trim();
        if (!topic) {
          return stop(
            context.toolCallId,
            blocked("summary", "No topic or idea", "Add a topic or idea there, then generate titles."),
          );
        }
        try {
          const generated = await loadTitles(slot, provider);
          const id = context.toolCallId || "generateTitles";
          const change = projectChangeFromTool(
            "generateTitles",
            { titles: generated.titles, provider, cursorPrompt: generated.cursorPrompt },
            slot.context,
            id,
          );
          if (!change || !context.toolCallId) {
            return { isError: true, content: [{ type: "text", text: "Could not prepare the titles." }] };
          }
          slot.proposals.set(context.toolCallId, change);
          return `Generated ${generated.titles.length} titles with ${provider}. They apply immediately when auto-apply is on.`;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not generate titles.";
          return { isError: true, content: [{ type: "text", text: message }] };
        }
      },
    },
    scoreTitles: {
      description:
        "Score the current titles. Always use Cursor. Pass provider vidiq only when the user explicitly said vidIQ. Do not invent scores.",
      inputSchema: objectSchema(
        { provider: { type: "string", description: "Omit unless the user named vidiq." } },
        [],
      ),
      async execute(args, context) {
        const titles = slot.context.titleOptions.filter((item) => item.text.trim());
        if (titles.length === 0) {
          return stop(
            context.toolCallId,
            blocked("title", "No titles yet", "Generate titles there, then score them."),
          );
        }
        try {
          if (namedProvider(args.provider) === "vidiq") {
            const scored: { id: string; score: number; rank: number }[] = [];
            for (const title of titles) {
              const result = await callVidiqTool<unknown>(
                slot.userId,
                "vidiq_score_title",
                { title: title.text, type: slot.context.format === "shorts" ? "short" : "long" },
                { sessionId: slot.context.projectId || undefined, step: "TITLE" },
              );
              const score = scoreFromVidiq(result);
              if (score == null) throw new Error("vidIQ returned an invalid title score.");
              scored.push({ id: title.id, score, rank: 0 });
            }
            scored.sort((a, b) => b.score - a.score);
            scored.forEach((item, index) => { item.rank = index + 1; });
            return proposeGenerated(slot, context.toolCallId, "scoreTitles", { scores: scored }, "Scored the titles with vidIQ.");
          }
          const prompts = await getEffectiveCursorPrompts(slot.userId);
          const result = await scoreTitlesWithCursor(prompts.titleScoring, {
            context: cursorContext(slot),
            titles,
          });
          return proposeGenerated(slot, context.toolCallId, "scoreTitles", { scores: result.scores }, "Scored the titles with Cursor.");
        } catch (error) {
          return stop(context.toolCallId, error instanceof Error ? error.message : "Could not score the titles.");
        }
      },
    },
    applyTitle: tool(
      "applyTitle",
      "Propose one title as the title list. The user must accept it.",
      objectSchema({ title: { type: "string", description: "Chosen title" } }, ["title"]),
    ),
    generateScript: {
      description:
        "Write the spoken script with Cursor. Do not write the script yourself. Pass provider only if the user explicitly named chatgpt or gemini.",
      inputSchema: objectSchema(
        { provider: { type: "string", description: "Omit unless the user named chatgpt or gemini." } },
        [],
      ),
      async execute(args, context) {
        const title = slot.context.selectedTitle.trim();
        const topic = slot.context.brief.trim();
        const notice = scriptFixNotice({
          topic,
          title,
          length: formatDurationLabel(slot.context.durationSeconds, slot.context.format),
          orientation: FORMAT_LABELS[slot.context.format],
          videoType: INTENT_LABELS[slot.context.intent],
          durationSeconds: slot.context.durationSeconds,
          references: [],
        });
        if (notice) {
          return stop(context.toolCallId, blocked(notice.step, notice.title, notice.message));
        }
        const provider = namedProvider(args.provider);
        if (provider === "vidiq") return stop(context.toolCallId, "Script generation uses Cursor unless you named ChatGPT or Gemini.");
        try {
          if (provider === "chatgpt" || provider === "gemini") {
            const mocked = await mockGenerate(
              "script",
              { prompt: `${topic}\n${title}`, durationSeconds: slot.context.durationSeconds, intent: slot.context.intent },
              provider,
            );
            return proposeGenerated(
              slot,
              context.toolCallId,
              "generateScript",
              { script: mocked, generated: true },
              `Wrote the script with ${provider}.`,
            );
          }
          const prompts = await getEffectiveCursorPrompts(slot.userId);
          const result = await generateScriptWithCursor(prompts.scriptGeneration, {
            topic: topic.slice(0, 2000),
            title: title.slice(0, 500),
            length: formatDurationLabel(slot.context.durationSeconds, slot.context.format).slice(0, 100),
            orientation: `${FORMAT_LABELS[slot.context.format]} (${aspectForFormat(slot.context.format)})`.slice(0, 100),
            videoType: INTENT_LABELS[slot.context.intent].slice(0, 100),
            durationSeconds: slot.context.durationSeconds,
            references: slot.context.references
              .filter((item) => item.title.trim() || item.transcript.trim())
              .slice(0, 5)
              .map((item) => ({ title: item.title.slice(0, 200), transcript: item.transcript.slice(0, 8000) })),
          });
          return proposeGenerated(
            slot,
            context.toolCallId,
            "generateScript",
            { script: result.script, cursorPrompt: result.promptUsed, generated: true },
            "Wrote the script with Cursor.",
          );
        } catch (error) {
          return stop(context.toolCallId, error instanceof Error ? error.message : "Could not write the script.");
        }
      },
    },
    scoreScript: {
      description:
        "Score the current script with Cursor. Pass provider only if the user explicitly named another scorer. Do not invent the score.",
      inputSchema: objectSchema(
        { provider: { type: "string", description: "Omit unless the user named another provider." } },
        [],
      ),
      async execute(args, context) {
        if (namedProvider(args.provider) === "vidiq") {
          return stop(context.toolCallId, "Script scoring from the agent uses Cursor. Use the script step if you want vidIQ.");
        }
        const script = slot.context.script.trim();
        if (!script) {
          return stop(
            context.toolCallId,
            blocked("script", "No script yet", "Generate or write a script there, then score it."),
          );
        }
        try {
          const prompts = await getEffectiveCursorPrompts(slot.userId);
          const result = await scoreScriptWithCursor(prompts.scriptScoring, {
            script,
            context: {
              topic: slot.context.brief.trim().slice(0, 500),
              title: slot.context.selectedTitle.trim().slice(0, 100) || null,
              format: FORMAT_LABELS[slot.context.format].slice(0, 100),
              intent: INTENT_LABELS[slot.context.intent].slice(0, 100),
              durationSeconds: slot.context.durationSeconds,
            },
          });
          const words = script.split(/\s+/).filter(Boolean).length;
          return proposeGenerated(
            slot,
            context.toolCallId,
            "scoreScript",
            {
              score: {
                provider: "cursor",
                score: result.score,
                grade: result.grade,
                hook: result.hook,
                retention: result.retention,
                keywordFit: result.keywordFit,
                cta: result.cta,
                keywords: result.keywords,
                notes: result.notes,
                wordCount: words,
                spokenMinutes: Math.round((words / 140) * 10) / 10,
                sourceHash: "",
              },
            },
            `Scored the script with Cursor: ${result.grade} ${result.score}.`,
          );
        } catch (error) {
          return stop(context.toolCallId, error instanceof Error ? error.message : "Could not score the script.");
        }
      },
    },
    checkScriptLowEffort: {
      description:
        "Check whether the current script is low-effort, repetitive, reused, or thin. Call this once when the user asks for a low-effort check. Do not invent the verdict. This uses Cursor, not vidIQ.",
      inputSchema: objectSchema({}, []),
      async execute(_args, context) {
        const script = slot.context.script.trim();
        if (!script) {
          return stop(
            context.toolCallId,
            blocked("script", "No script yet", "Generate or write a script there, then check it."),
          );
        }
        try {
          const prompts = await getEffectiveCursorPrompts(slot.userId);
          const result = await checkScriptLowEffortWithCursor(prompts.scriptLowEffort, {
            script: script.slice(0, 120_000),
            durationSeconds: Math.max(1, Math.min(7200, Math.round(slot.context.durationSeconds))),
            topic: slot.context.brief.trim().slice(0, 500),
            title: slot.context.selectedTitle.trim().slice(0, 100),
            references: slot.context.references
              .map((item) => item.transcript.trim())
              .filter(Boolean)
              .slice(0, 5)
              .map((transcript) => transcript.slice(0, 50_000)),
          });
          return proposeGenerated(
            slot,
            context.toolCallId,
            "checkScriptLowEffort",
            {
              summary: result.summary,
              score: result.score,
              verdict: result.verdict,
              findings: result.findings,
            },
            `Low-effort check: ${result.verdict}, score ${result.score}. ${result.summary}`,
          );
        } catch (error) {
          return stop(context.toolCallId, error instanceof Error ? error.message : "Could not check the script.");
        }
      },
    },
    editScript: tool(
      "editScript",
      "Propose an edited full script. The user must accept it.",
      objectSchema({ script: { type: "string", description: "Edited script" } }, ["script"]),
    ),
    generateThumbnailPrompt: {
      description:
        "Generate thumbnail prompts with Cursor. Do not write the prompts yourself. Pass provider only if the user explicitly named chatgpt, gemini, or vidiq.",
      inputSchema: objectSchema(
        { provider: { type: "string", description: "Omit unless the user named chatgpt, gemini, or vidiq." } },
        [],
      ),
      async execute(args, context) {
        if (namedProvider(args.provider)) {
          return stop(context.toolCallId, "Thumbnail prompts from the agent use Cursor unless that provider is connected on the thumbnail step.");
        }
        const title = slot.context.selectedTitle.trim();
        if (!title) {
          return stop(
            context.toolCallId,
            blocked("title", "No title selected", "Select a title there, then generate thumbnail prompts."),
          );
        }
        try {
          const prompts = await getEffectiveCursorPrompts(slot.userId);
          const result = await generateThumbnailPromptsWithCursor(prompts.thumbnailPromptGeneration, {
            title: title.slice(0, 200),
            format: FORMAT_LABELS[slot.context.format].slice(0, 100),
            intent: INTENT_LABELS[slot.context.intent].slice(0, 100),
          });
          return proposeGenerated(
            slot,
            context.toolCallId,
            "generateThumbnailPrompt",
            { concepts: result.prompts, cursorPrompt: result.promptUsed },
            "Generated thumbnail prompts with Cursor.",
          );
        } catch (error) {
          return stop(context.toolCallId, error instanceof Error ? error.message : "Could not generate thumbnail prompts.");
        }
      },
    },
    generateThumbnailImages: {
      description:
        "Generate a vidIQ image for every current thumbnail prompt in one call. Use this when the user wants thumbnail images, including all of them at once. Do not invent image URLs and do not call this once per prompt.",
      inputSchema: objectSchema({}, []),
      async execute(_args, context) {
        const prompts = slot.context.thumbnails
          .filter((item) => item.id && item.concept.trim())
          .slice(0, 8);
        if (prompts.length === 0) {
          return stop(
            context.toolCallId,
            blocked("thumbnail", "No thumbnail prompts", "Generate thumbnail prompts there, then create the images."),
          );
        }
        const projectId = slot.context.projectId.trim();
        if (!isThumbnailId(projectId)) return stop(context.toolCallId, "Open a video before generating thumbnail images.");
        if (await isDeletedVideoSession(projectId)) return stop(context.toolCallId, "This video was permanently deleted.");
        const session = await prisma.videoSession.findFirst({
          where: { id: projectId, userId: slot.userId },
          select: { id: true, channel: { select: { channelId: true } } },
        });
        if (!session) return stop(context.toolCallId, "Open a video before generating thumbnail images.");
        const images: { id: string; url: string }[] = [];
        const failed: string[] = [];
        for (const prompt of prompts) {
          try {
            const url = await generateVidiqThumbnailImage({
              userId: slot.userId,
              sessionId: session.id,
              channelId: session.channel?.channelId,
              thumbnailId: prompt.id,
              prompt: prompt.concept.trim(),
              title: slot.context.selectedTitle.trim() || undefined,
              format: slot.context.format === "shorts" ? "short" : "long",
            });
            images.push({ id: prompt.id, url });
          } catch (error) {
            failed.push(error instanceof Error ? error.message : "vidIQ could not generate an image.");
          }
        }
        if (images.length === 0) {
          return stop(context.toolCallId, failed[0] || "vidIQ could not generate the thumbnail images.");
        }
        const note = failed.length > 0 ? ` ${failed.length} prompt${failed.length === 1 ? "" : "s"} failed.` : "";
        return proposeGenerated(
          slot,
          context.toolCallId,
          "generateThumbnailImages",
          { images },
          `Generated ${images.length} thumbnail image${images.length === 1 ? "" : "s"} with vidIQ.${note}`,
        );
      },
    },
    scoreThumbnails: {
      description:
        "Score every current thumbnail image with vidIQ. Use this when the user wants thumbnail scores, analysis, or feedback on the images or prompts. Do not invent scores. Call it once for all thumbnails.",
      inputSchema: objectSchema({}, []),
      async execute(_args, context) {
        const ready = slot.context.thumbnails.filter(
          (item) => item.imageUrl?.startsWith("https://") && item.id,
        );
        if (ready.length === 0) {
          return stop(
            context.toolCallId,
            blocked("thumbnail", "No thumbnail images", "Generate or upload an image there, then score it."),
          );
        }
        const title = slot.context.selectedTitle.trim();
        if (!title) {
          return stop(
            context.toolCallId,
            blocked("title", "No title selected", "Select a title there, then score the thumbnails."),
          );
        }
        const videoId = slot.context.references
          .map((reference) => parseYoutubeVideoId(reference.url))
          .find((id): id is string => Boolean(id));
        if (!videoId) {
          return stop(
            context.toolCallId,
            blocked(
              "summary",
              "No reference video",
              "Add a reference YouTube video there. vidIQ scores each thumbnail against one.",
            ),
          );
        }
        const projectId = slot.context.projectId.trim();
        if (!isThumbnailId(projectId) || (await isDeletedVideoSession(projectId))) {
          return stop(context.toolCallId, "Open a video before scoring thumbnails.");
        }
        const session = await prisma.videoSession.findFirst({
          where: { id: projectId, userId: slot.userId },
          select: { id: true, channel: { select: { channelId: true } } },
        });
        if (!session) return stop(context.toolCallId, "Open a video before scoring thumbnails.");
        const insights: Record<string, ReturnType<typeof insightFromThumbnailScore>> = {};
        const failed: string[] = [];
        for (const thumb of ready.slice(0, 8)) {
          try {
            const image = thumb.imageUrl ? await thumbnailImageDataUri(thumb.imageUrl) : "";
            const result = await callVidiqTool<unknown>(
              slot.userId,
              "vidiq_score_thumbnail",
              { videoId, title: title.slice(0, 500), image },
              {
                sessionId: session.id,
                step: "THUMBNAIL",
                channelId: session.channel?.channelId,
              },
            );
            const score = thumbnailScoreFromResult(result);
            if (!score) throw new Error("vidIQ returned an invalid thumbnail score.");
            insights[thumb.id] = insightFromThumbnailScore(score);
          } catch (error) {
            failed.push(error instanceof Error ? error.message : "vidIQ could not score a thumbnail.");
          }
        }
        if (Object.keys(insights).length === 0) {
          return stop(context.toolCallId, failed[0] || "vidIQ could not score the thumbnails.");
        }
        const lines = Object.values(insights).map((insight) => `${insight.grade} ${insight.score}`);
        const note = failed.length > 0 ? ` ${failed.length} image${failed.length === 1 ? "" : "s"} failed.` : "";
        return proposeGenerated(
          slot,
          context.toolCallId,
          "scoreThumbnails",
          { insights },
          `Scored ${lines.length} thumbnail${lines.length === 1 ? "" : "s"} with vidIQ: ${lines.join(", ")}.${note}`,
        );
      },
    },
    generateVisualPrompts: {
      description:
        "Generate scene visual prompts with Cursor. A direct scene gets one clip prompt. A scene set to image-then-clip also gets an opening-frame prompt. Do not write the prompts yourself. Do not change a scene's clip source. Pass provider only if the user explicitly named another provider.",
      inputSchema: objectSchema(
        { provider: { type: "string", description: "Omit unless the user named another provider." } },
        [],
      ),
      async execute(args, context) {
        if (namedProvider(args.provider)) {
          return stop(context.toolCallId, "Visual prompts from the agent use Cursor.");
        }
        const scenes = slot.context.scenes.filter((scene) => scene.script.trim());
        if (!slot.context.script.trim()) {
          return stop(
            context.toolCallId,
            blocked("script", "No script yet", "Generate a script there before writing visual prompts."),
          );
        }
        if (scenes.length === 0) {
          return stop(
            context.toolCallId,
            blocked("timeline", "No scenes yet", "Open the timeline and add scenes there, then generate visual prompts."),
          );
        }
        try {
          const prompts = await getEffectiveCursorPrompts(slot.userId);
          const sequence: VisualPromptScene[] = scenes.map((scene) => ({
            id: scene.id,
            section: scene.section,
            script: scene.script,
            durationSeconds: scene.durationSeconds,
            order: scene.order,
            existingPrompt: scene.existingPrompt || null,
            clipSource: scene.clipSource === "still" ? "still" : "direct",
          }));
          const rawStyle = slot.context.visualStyle ?? "";
          const styleId = isVisualStyleId(rawStyle) ? rawStyle : null;
          const sessionPrompt = (slot.context.visualStylePrompt ?? "").trim();
          const result = await generateVisualPromptsWithCursor(prompts.visualPromptGeneration, {
            topic: slot.context.brief.trim().slice(0, 2000),
            title: slot.context.selectedTitle.trim().slice(0, 500),
            aspectRatio: aspectForFormat(slot.context.format),
            scenes: sequence,
            sequence,
            styleId,
            stylePrompt: sessionPrompt || null,
          });
          return proposeGenerated(
            slot,
            context.toolCallId,
            "generateVisualPrompts",
            { prompts: result.prompts },
            "Generated visual prompts with Cursor.",
          );
        } catch (error) {
          return stop(context.toolCallId, error instanceof Error ? error.message : "Could not generate visual prompts.");
        }
      },
    },
    updateTimeline: tool(
      "updateTimeline",
      "Propose timeline scenes. The user must accept them.",
      objectSchema(
        {
          scenes: {
            type: "array",
            description: "Scenes in order",
            items: {
              type: "object",
              properties: {
                sectionLabel: { type: "string" },
                finalScript: { type: "string" },
              },
              required: ["sectionLabel", "finalScript"],
            },
          },
        },
        ["scenes"],
      ),
    ),
    writeDescription: tool(
      "writeDescription",
      "Propose the YouTube description and tags. The user must accept them.",
      objectSchema(
        {
          description: { type: "string", description: "Video description" },
          tags: { type: "array", description: "Tags", items: { type: "string" } },
        },
        ["description"],
      ),
    ),
    navigateToStep: tool(
      "navigateToStep",
      "Propose moving to a create step: summary, title, thumbnail, script, timeline, description, render, or editor.",
      objectSchema({ step: { type: "string", description: "Step id" } }, ["step"]),
    ),
    markStepApproved: tool(
      "markStepApproved",
      "Propose approving a create step. The user must accept it.",
      objectSchema({ step: { type: "string", description: "Step id" } }, ["step"]),
    ),
    setProjectName: tool(
      "setProjectName",
      "Propose a new project name, the title at the top of the workspace. This is not the YouTube video title. The user must accept it.",
      objectSchema({ name: { type: "string", description: "Project name" } }, ["name"]),
    ),
    addReference: {
      description:
        "Add one YouTube reference video by URL. Call this once per video. The user must accept it before the link appears.",
      inputSchema: objectSchema({ url: { type: "string", description: "YouTube video URL" } }, ["url"]),
      execute(args, context) {
        const url = typeof args.url === "string" ? args.url.trim() : "";
        if (!parseYoutubeVideoId(url)) {
          return { isError: true, content: [{ type: "text", text: "Enter a valid YouTube video link." }] };
        }
        if (slot.context.references.length >= MAX_REFERENCES) {
          return { isError: true, content: [{ type: "text", text: `Up to ${MAX_REFERENCES} reference videos.` }] };
        }
        if (slot.context.references.some((item) => item.url.trim() === url)) {
          return { isError: true, content: [{ type: "text", text: "That reference video is already added." }] };
        }
        return propose(slot, "addReference", { url }, context.toolCallId);
      },
    },
    setApproxLength: {
      description:
        "Set the approximate video length. Pass seconds. Shorts run from 15 seconds to 5 minutes in 15 second steps. Long-form starts at 5 minutes and moves in 1 minute steps. The user must accept it.",
      inputSchema: objectSchema(
        { seconds: { type: "number", description: "Target length in seconds" } },
        ["seconds"],
      ),
      execute(args, context) {
        return propose(slot, "setApproxLength", args, context.toolCallId);
      },
    },
    fetchReferenceTranscript: {
      description:
        "Fetch the transcript for one reference YouTube video. Call this once for each video that does not already have a transcript. The user must accept the result before it is saved.",
      inputSchema: objectSchema(
        { url: { type: "string", description: "YouTube video URL already added or to attach the transcript to" } },
        ["url"],
      ),
      async execute(args, context) {
        const url = typeof args.url === "string" ? args.url.trim() : "";
        const videoId = parseYoutubeVideoId(url);
        if (!videoId) {
          return { isError: true, content: [{ type: "text", text: "Enter a valid YouTube video link." }] };
        }
        const [result, title] = await Promise.all([
          fetchReferenceTranscript(videoId),
          fetchYoutubeVideoTitle(videoId),
        ]);
        if (!result.ok) {
          return { isError: true, content: [{ type: "text", text: result.message }] };
        }
        const fetchedAt = new Date().toISOString();
        const id = context.toolCallId || "fetchReferenceTranscript";
        const change = projectChangeFromTool(
          "fetchReferenceTranscript",
          {
            url,
            title: title ?? "",
            transcript: result.transcript,
            lang: result.lang ?? "",
            fetchedAt,
          },
          slot.context,
          id,
        );
        if (!change || !context.toolCallId) {
          return { isError: true, content: [{ type: "text", text: "Could not prepare the transcript." }] };
        }
        slot.proposals.set(context.toolCallId, change);
        return `Fetched the transcript for ${title || url}. ${result.wordCount} words. The user must accept it before it is saved.`;
      },
    },
  };
}
