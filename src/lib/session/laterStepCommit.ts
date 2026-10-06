import {
  DEFAULT_QWEN_VOICE,
  normalizeElevenLabsVoice,
  normalizeQwenVoice,
  type EditorSettings,
  type ElevenLabsVoice,
  type LowEffortReport,
  type QwenVoice,
  type Scene,
  type ScriptScore,
  type StepId,
  type StepStatus,
  type ThumbnailOption,
  type VideoProject,
} from "@/lib/videoProject";

export const MARK_APPROVE_STEPS: readonly StepId[] = [
  "summary",
  "title",
  "thumbnail",
  "script",
  "timeline",
  "description",
  "render",
];

export function savesOnMarkApprove(step: StepId): boolean {
  return MARK_APPROVE_STEPS.includes(step);
}

export type LaterStepId = "thumbnail" | "script" | "timeline" | "description" | "render" | "editor";

type ThumbnailCommit = {
  thumbnails: ThumbnailOption[];
  selectedThumbnailId: string | null;
  cursorThumbnailPrompt: string | null;
  provider: VideoProject["providerByStep"]["thumbnail"];
  stepStatus: StepStatus;
};

type ScriptCommit = {
  fullScript: string;
  cursorScriptPrompt: string | null;
  scriptScore: ScriptScore | undefined;
  provider: VideoProject["providerByStep"]["script"];
  stepStatus: StepStatus;
  lowEffort: LowEffortReport | undefined;
};

type TimelineCommit = {
  scenes: Scene[];
  elevenLabsVoice: ElevenLabsVoice | null;
  qwenVoice: QwenVoice;
  provider: VideoProject["providerByStep"]["timeline"];
  stepStatus: StepStatus;
  lowEffort: LowEffortReport | undefined;
};

type DescriptionCommit = {
  description: string;
  tags: string[];
  provider: VideoProject["providerByStep"]["description"];
  stepStatus: StepStatus;
};

type RenderCommit = {
  renderedAt: string | null;
  stepStatus: StepStatus;
  lowEffort: LowEffortReport | undefined;
};

type EditorCommit = {
  editor: EditorSettings;
  stepStatus: StepStatus;
};

export type LaterStepsCommit = {
  thumbnail: ThumbnailCommit;
  script: ScriptCommit;
  timeline: TimelineCommit;
  description: DescriptionCommit;
  render: RenderCommit;
  editor: EditorCommit;
};

export function captureLaterStepsCommit(project: VideoProject): LaterStepsCommit {
  return {
    thumbnail: thumbnailSlice(project, project.stepStatus.thumbnail),
    script: scriptSlice(project, project.stepStatus.script),
    timeline: timelineSlice(project, project.stepStatus.timeline),
    description: descriptionSlice(project, project.stepStatus.description),
    render: renderSlice(project, project.stepStatus.render),
    editor: editorSlice(project, project.stepStatus.editor),
  };
}

export function withLaterStep(
  commit: LaterStepsCommit,
  project: VideoProject,
  step: LaterStepId,
  status: StepStatus,
): LaterStepsCommit {
  switch (step) {
    case "thumbnail":
      return { ...commit, thumbnail: thumbnailSlice(project, status) };
    case "script":
      return { ...commit, script: scriptSlice(project, status) };
    case "timeline":
      return { ...commit, timeline: timelineSlice(project, status) };
    case "description":
      return { ...commit, description: descriptionSlice(project, status) };
    case "render":
      return { ...commit, render: renderSlice(project, status) };
    case "editor":
      return { ...commit, editor: editorSlice(project, status) };
  }
}

export function laterStepMatches(
  project: VideoProject,
  commit: LaterStepsCommit,
  step: LaterStepId,
): boolean {
  const current = captureLaterStepsCommit(project);
  switch (step) {
    case "thumbnail":
      return thumbnailSignature(current.thumbnail) === thumbnailSignature(commit.thumbnail);
    case "script":
      return scriptSignature(current.script) === scriptSignature(commit.script);
    case "timeline":
      return timelineSignature(current.timeline) === timelineSignature(commit.timeline);
    case "description":
      return descriptionSignature(current.description) === descriptionSignature(commit.description);
    case "render":
      return renderSignature(current.render) === renderSignature(commit.render);
    case "editor":
      return editorSignature(current.editor.editor) === editorSignature(commit.editor.editor);
  }
}

export function applyLaterSteps(project: VideoProject, commit: LaterStepsCommit): VideoProject {
  const providerByStep = { ...project.providerByStep };
  assignProvider(providerByStep, "thumbnail", commit.thumbnail.provider);
  assignProvider(providerByStep, "script", commit.script.provider);
  assignProvider(providerByStep, "timeline", commit.timeline.provider);
  assignProvider(providerByStep, "description", commit.description.provider);

  const lowEffortByStep: VideoProject["lowEffortByStep"] = {};
  if (commit.script.lowEffort) lowEffortByStep.script = commit.script.lowEffort;
  if (commit.timeline.lowEffort) lowEffortByStep.timeline = commit.timeline.lowEffort;
  if (commit.render.lowEffort) lowEffortByStep.render = commit.render.lowEffort;

  return {
    ...project,
    thumbnails: commit.thumbnail.thumbnails,
    selectedThumbnailId: commit.thumbnail.selectedThumbnailId,
    cursorThumbnailPrompt: commit.thumbnail.cursorThumbnailPrompt,
    fullScript: commit.script.fullScript,
    cursorScriptPrompt: commit.script.cursorScriptPrompt,
    scriptScore: commit.script.scriptScore,
    scenes: commit.timeline.scenes,
    elevenLabsVoice: commit.timeline.elevenLabsVoice,
    qwenVoice: commit.timeline.qwenVoice,
    description: commit.description.description,
    tags: commit.description.tags,
    renderedAt: commit.render.renderedAt,
    editor: commit.editor.editor,
    providerByStep,
    lowEffortByStep,
    stepStatus: {
      ...project.stepStatus,
      thumbnail: commit.thumbnail.stepStatus,
      script: commit.script.stepStatus,
      timeline: commit.timeline.stepStatus,
      description: commit.description.stepStatus,
      render: commit.render.stepStatus,
      editor: commit.editor.stepStatus,
    },
  };
}

function assignProvider(
  providers: VideoProject["providerByStep"],
  step: StepId,
  provider: VideoProject["providerByStep"][StepId],
) {
  if (provider) providers[step] = provider;
  else delete providers[step];
}

function thumbnailSlice(project: VideoProject, stepStatus: StepStatus): ThumbnailCommit {
  return {
    thumbnails: structuredClone(project.thumbnails),
    selectedThumbnailId: project.selectedThumbnailId,
    cursorThumbnailPrompt:
      typeof project.cursorThumbnailPrompt === "string" ? project.cursorThumbnailPrompt : null,
    provider: project.providerByStep.thumbnail,
    stepStatus,
  };
}

function scriptSlice(project: VideoProject, stepStatus: StepStatus): ScriptCommit {
  return {
    fullScript: project.fullScript,
    cursorScriptPrompt:
      typeof project.cursorScriptPrompt === "string" ? project.cursorScriptPrompt : null,
    scriptScore: project.scriptScore ? structuredClone(project.scriptScore) : undefined,
    provider: project.providerByStep.script,
    stepStatus,
    lowEffort: project.lowEffortByStep.script
      ? structuredClone(project.lowEffortByStep.script)
      : undefined,
  };
}

function timelineSlice(project: VideoProject, stepStatus: StepStatus): TimelineCommit {
  return {
    scenes: structuredClone(project.scenes),
    elevenLabsVoice: normalizeElevenLabsVoice(project.elevenLabsVoice),
    qwenVoice: normalizeQwenVoice(project.qwenVoice) ?? DEFAULT_QWEN_VOICE,
    provider: project.providerByStep.timeline,
    stepStatus,
    lowEffort: project.lowEffortByStep.timeline
      ? structuredClone(project.lowEffortByStep.timeline)
      : undefined,
  };
}

function descriptionSlice(project: VideoProject, stepStatus: StepStatus): DescriptionCommit {
  return {
    description: project.description,
    tags: [...project.tags],
    provider: project.providerByStep.description,
    stepStatus,
  };
}

function renderSlice(project: VideoProject, stepStatus: StepStatus): RenderCommit {
  return {
    renderedAt: project.renderedAt,
    stepStatus,
    lowEffort: project.lowEffortByStep.render
      ? structuredClone(project.lowEffortByStep.render)
      : undefined,
  };
}

function editorSlice(project: VideoProject, stepStatus: StepStatus): EditorCommit {
  return {
    editor: structuredClone(project.editor),
    stepStatus,
  };
}

function thumbnailSignature(commit: ThumbnailCommit): string {
  return JSON.stringify({
    selectedThumbnailId: commit.selectedThumbnailId,
    cursorThumbnailPrompt: commit.cursorThumbnailPrompt,
    provider: commit.provider ?? null,
    thumbnails: commit.thumbnails.map((thumb) => ({
      id: thumb.id,
      concept: thumb.concept,
      provider: thumb.provider,
      customUrl: thumb.customUrl ?? null,
      vidiq: thumb.vidiq ?? null,
    })),
  });
}

function scriptSignature(commit: ScriptCommit): string {
  return JSON.stringify({
    fullScript: commit.fullScript,
    cursorScriptPrompt: commit.cursorScriptPrompt,
    provider: commit.provider ?? null,
    scriptScore: commit.scriptScore ?? null,
    lowEffort: commit.lowEffort ?? null,
  });
}

function timelineSignature(commit: TimelineCommit): string {
  return JSON.stringify({
    provider: commit.provider ?? null,
    scenes: commit.scenes,
    elevenLabsVoice: commit.elevenLabsVoice,
    qwenVoice: commit.qwenVoice,
    lowEffort: commit.lowEffort ?? null,
  });
}

function descriptionSignature(commit: DescriptionCommit): string {
  return JSON.stringify({
    description: commit.description,
    tags: commit.tags,
    provider: commit.provider ?? null,
  });
}

function renderSignature(commit: RenderCommit): string {
  return JSON.stringify({
    renderedAt: commit.renderedAt,
    lowEffort: commit.lowEffort ?? null,
  });
}

function editorSignature(editor: EditorSettings): string {
  return JSON.stringify({
    musicTrackId: editor.musicTrackId,
    musicVolume: editor.musicVolume,
    captions: editor.captions,
    exportedAt: editor.exportedAt,
  });
}
