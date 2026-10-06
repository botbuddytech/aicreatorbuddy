import { spokenVoiceoverText } from "@/lib/sceneVoiceover";
import {
  sessionVisualStylePrompt,
  visualStyleById,
  type VisualStyleId,
} from "@/lib/visualStyles";
import {
  FORMAT_LABELS,
  INTENT_LABELS,
  formatDurationLabel,
  formatTimecode,
  projectDisplayName,
  sceneDuration,
  sceneRuntimeSeconds,
  selectedTitle,
  totalTimelineSeconds,
  type Scene,
  type VideoProject,
} from "@/lib/videoProject";

function blank(value: string | null | undefined, empty = "Empty"): string {
  const text = value?.trim() ?? "";
  return text || empty;
}

function block(value: string | null | undefined): string {
  const text = value?.trim() ?? "";
  return text || "Empty";
}

function secondsLabel(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "Not measured";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}s` : `${rounded.toFixed(1)}s`;
}

function styleWording(styleId: VisualStyleId | null, project: VideoProject): string {
  if (!styleId) return "None";
  return sessionVisualStylePrompt(styleId, project.visualStylePrompts) ?? visualStyleById(styleId).prompt;
}

function sceneSection(scene: Scene, index: number): string {
  const clipPath = scene.visuals.clipSource === "still" ? "Image, then clip" : "Direct clip";
  const lines = [
    `### ${index + 1}. ${scene.sectionLabel || `Scene ${index + 1}`}`,
    "",
    `- Clip path: ${clipPath}`,
    `- Status: ${scene.status}`,
    `- Script length: ${secondsLabel(sceneDuration(scene))}`,
    `- Voice length: ${secondsLabel(scene.editing.voiceSeconds)}`,
    `- Playback length: ${secondsLabel(sceneRuntimeSeconds(scene))}`,
    "",
    "Spoken script:",
    "",
    block(spokenVoiceoverText(scene.finalScript)),
    "",
    "Image prompt:",
    "",
    scene.visuals.clipSource === "still" ? block(scene.visuals.imagePrompt) : "Not used",
    "",
    "Clip prompt:",
    "",
    block(scene.visuals.description),
    "",
    `- Start image: ${blank(scene.visuals.startFrameUrl, "None")}`,
    scene.visuals.startFrameName ? `- Start image file: ${scene.visuals.startFrameName}` : null,
    `- Clip: ${
      scene.visuals.uploadedClipUrl || scene.visuals.uploadedClipName
        ? [
            scene.visuals.uploadedClipName || "Uploaded clip",
            scene.visuals.uploadedClipKind || "file",
            secondsLabel(scene.visuals.uploadedClipDurationSeconds),
          ].join(" · ")
        : "None"
    }`,
    scene.visuals.uploadedClipUrl ? `- Clip URL: ${scene.visuals.uploadedClipUrl}` : null,
  ];
  return lines.filter((line) => line !== null).join("\n");
}

/** A context brief another tool can read. Pictures stay as prompts and URLs. */
export function buildVideoMarkdown(project: VideoProject): string {
  const title = selectedTitle(project)?.text.trim() || "No title selected";
  const thumbnail = project.thumbnails.find((item) => item.id === project.selectedThumbnailId);
  const styleId = project.visualStyle;
  const style = styleId ? visualStyleById(styleId) : null;
  const sections = [
    `# ${title}`,
    "",
    "## Project",
    "",
    `- Name: ${projectDisplayName(project)}`,
    `- Topic: ${blank(project.summary.topic, "None")}`,
    `- Format: ${FORMAT_LABELS[project.summary.format]}`,
    `- Aspect ratio: ${project.summary.aspectRatio}`,
    `- Intent: ${INTENT_LABELS[project.summary.intent]}`,
    `- Target length: ${formatDurationLabel(project.summary.durationSeconds, project.summary.format)}`,
    `- Channel: ${blank(project.channelId, "None")}`,
    "",
    "## Title",
    "",
    title,
    "",
    "## Thumbnail",
    "",
    block(thumbnail?.concept),
    thumbnail?.customUrl ? `\nThumbnail image: ${thumbnail.customUrl}` : "",
    "",
    "## Description",
    "",
    block(project.description),
    "",
    "## Tags",
    "",
    project.tags.length > 0 ? project.tags.join(", ") : "None",
    "",
    "## Style",
    "",
    `- Name: ${style?.label ?? "None"}`,
    "",
    styleWording(styleId, project),
    "",
    "## Voices",
    "",
    `- Qwen: ${project.qwenVoice.name} (${project.qwenVoice.voiceId})`,
    `- ElevenLabs: ${
      project.elevenLabsVoice
        ? `${project.elevenLabsVoice.name} (${project.elevenLabsVoice.voiceId})`
        : "None"
    }`,
    "",
    "## Script",
    "",
    block(project.fullScript),
    "",
    "## Timeline",
    "",
    `- Scenes: ${project.scenes.length}`,
    `- Runtime: ${formatTimecode(totalTimelineSeconds(project.scenes))}`,
    "",
    "## Scenes",
    "",
    project.scenes.length > 0
      ? project.scenes.map((scene, index) => sceneSection(scene, index)).join("\n\n")
      : "No scenes yet.",
    "",
  ];
  return sections.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export function videoMarkdownFileName(project: VideoProject): string {
  const source = selectedTitle(project)?.text.trim() || projectDisplayName(project);
  const cleaned = source
    .replace(/[^\w\s.-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${cleaned || "video"}.md`;
}
