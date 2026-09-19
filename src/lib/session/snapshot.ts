import type {
  SessionAssetSnapshot,
  SessionCheckSnapshot,
  SessionReferenceSnapshot,
  SessionSceneSnapshot,
  SessionSnapshot,
} from "@/lib/session/contract";
import type { SessionStepSnapshot } from "@/lib/session/stepData";
import {
  deriveReadiness,
  resolveProjectName,
  sceneDuration,
  selectedTitle,
  totalEstimatedApiCost,
  totalTimelineSeconds,
  type StepId,
  type VideoProject,
} from "@/lib/videoProject";

function words(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function callsFor(project: VideoProject, step: StepId): number {
  return project.apiCosts.filter((call) => call.step === step).length;
}

function selectedThumbnail(project: VideoProject) {
  return project.thumbnails.find((item) => item.id === project.selectedThumbnailId);
}

function buildSteps(
  project: VideoProject,
  channelTitle: string | null,
): SessionStepSnapshot[] {
  const readiness = deriveReadiness(project);
  const title = selectedTitle(project);
  const thumbnail = selectedThumbnail(project);
  const transitions = [...new Set(project.scenes.map((scene) => scene.editing.transition))]
    .filter((item) => item !== "none");
  const filters = [...new Set(project.scenes.map((scene) => scene.editing.filter))]
    .filter((item) => item !== "none");
  const generationCount = (step: StepId) => callsFor(project, step);
  const common = <T extends StepId>(step: T, data: SessionStepSnapshot<T>["data"]) => ({
    step,
    state: project.stepStatus[step],
    provider: project.providerByStep[step] ?? null,
    data,
    apiCallCount: callsFor(project, step),
    generationCount: generationCount(step),
  }) as SessionStepSnapshot<T>;

  return [
    common("summary", {
      channelId: project.channelId || null,
      channelTitle,
      format: project.summary.format,
      aspectRatio: project.summary.aspectRatio,
      intent: project.summary.intent,
      targetDurationSec: project.summary.durationSeconds,
      topic: project.summary.topic,
      referenceCount: project.summary.references.length,
      referencesWithTranscript: project.summary.references.filter((item) => item.transcript.trim())
        .length,
      referencesFetched: project.summary.references.filter(
        (item) => item.transcriptSource === "fetched",
      ).length,
    }),
    common("title", {
      generatedCount: project.titles.length,
      selectedTitleId: project.selectedTitleId,
      selectedTitle: title?.text ?? null,
      editedCount: 0,
      scores: project.titles.flatMap((item) =>
        item.score
          ? [{
              titleId: item.id,
              provider: item.score.provider,
              score: item.score.score,
              rank: item.score.rank,
            }]
          : [],
      ),
    }),
    common("thumbnail", {
      conceptCount: project.thumbnails.length,
      customUploadCount: project.thumbnails.filter((item) => Boolean(item.customUrl)).length,
      selectedThumbnailId: project.selectedThumbnailId,
      selectedConcept: thumbnail?.concept ?? null,
      vidiq: thumbnail?.vidiq ? { ...thumbnail.vidiq } : null,
    }),
    common("script", {
      wordCount: words(project.fullScript),
      charCount: project.fullScript.length,
      manualEditCount: 0,
      score: project.scriptScore ? { ...project.scriptScore } : null,
    }),
    common("timeline", {
      sceneCount: project.scenes.length,
      totalSeconds: totalTimelineSeconds(project.scenes),
      targetSeconds: project.summary.durationSeconds,
      scenesWithClip: project.scenes.filter((scene) => scene.visuals.uploadedClipId).length,
      scenesWithVoiceover: project.scenes.filter((scene) => scene.voiceover.audioUrl).length,
      manualClipCount: project.scenes.filter((scene) => scene.visuals.uploadedClipId).length,
      splitCount: 0,
      deleteCount: 0,
      viewMode: null,
    }),
    common("description", {
      charCount: project.description.length,
      tagCount: project.tags.length,
      hashtagCount: (project.description.match(/#[\w-]+/g) ?? []).length,
    }),
    common("render", {
      readinessComplete: readiness.filter((item) => item.complete).length,
      readinessTotal: readiness.length,
      renderedAt: project.renderedAt,
      lowEffortVerdict: project.lowEffortByStep.render?.verdict ?? null,
    }),
    common("editor", {
      musicTrackId: project.editor.musicTrackId,
      musicVolume: project.editor.musicVolume,
      captions: project.editor.captions,
      transitionsUsed: transitions,
      filtersUsed: filters,
      overlayCount: project.scenes.filter((scene) => scene.editing.textOverlay).length,
      confirmedAt: project.editor.confirmedAt,
      exportCount: project.editor.exportedAt ? 1 : 0,
    }),
  ];
}

function buildScenes(project: VideoProject): SessionSceneSnapshot[] {
  return project.scenes.map((scene) => ({
    sceneKey: scene.id,
    order: scene.order,
    sectionLabel: scene.sectionLabel,
    status: scene.status,
    durationSec: sceneDuration(scene),
    trimStartSec: scene.editing.trimStartSeconds,
    transition: scene.editing.transition,
    filter: scene.editing.filter,
    speed: scene.editing.speed,
    volume: scene.editing.volume,
    hasClip: Boolean(scene.visuals.uploadedClipId),
    hasVoiceover: Boolean(scene.voiceover.audioUrl),
    wordCount: words(scene.finalScript),
  }));
}

function buildAssets(project: VideoProject): SessionAssetSnapshot[] {
  return project.scenes.flatMap((scene) => {
    if (!scene.visuals.uploadedClipId) return [];
    return [{
      localClipId: scene.visuals.uploadedClipId,
      sceneKey: scene.id,
      kind: "UPLOADED_CLIP" as const,
      source: "MANUAL_UPLOAD" as const,
      addedAtStep: "timeline" as const,
      fileName: scene.visuals.uploadedClipName,
      mimeType: null,
      sizeBytes: null,
      durationSec: scene.visuals.uploadedClipDurationSeconds,
      storageUrl: null,
    }];
  });
}

function buildChecks(project: VideoProject): SessionCheckSnapshot[] {
  return Object.values(project.lowEffortByStep).flatMap((report) =>
    report
      ? [{
          scope: report.scope,
          provider: report.provider,
          verdict: report.verdict,
          score: report.score,
          sourceHash: report.sourceHash,
          summary: report.summary ?? null,
          findings: report.findings,
          checkedAt: report.checkedAt,
        }]
      : [],
  );
}

function referenceVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{11})/i,
  );
  return match?.[1] ?? null;
}

function buildReferences(project: VideoProject): SessionReferenceSnapshot[] {
  return project.summary.references.map((reference, order) => {
    const transcript = reference.transcript.trim();
    return {
      referenceKey: reference.id,
      order,
      url: reference.url.trim(),
      videoId: referenceVideoId(reference.url),
      hasTranscript: Boolean(transcript),
      charCount: transcript.length,
      wordCount: transcript ? transcript.split(/\s+/).length : 0,
    };
  });
}

export function buildSnapshot(
  project: VideoProject,
  currentStep: StepId,
  channelTitle: string | null = null,
): SessionSnapshot {
  return {
    id: project.id,
    name: resolveProjectName(project),
    currentStep,
    channelId: project.channelId || null,
    topic: project.summary.topic,
    format: project.summary.format,
    aspectRatio: project.summary.aspectRatio,
    intent: project.summary.intent,
    targetDurationSec: project.summary.durationSeconds,
    referenceCount: project.summary.references.length,
    sceneCount: project.scenes.length,
    timelineSeconds: totalTimelineSeconds(project.scenes),
    approvedStepCount: Object.values(project.stepStatus).filter((state) => state === "approved").length,
    estimatedCostUsd: totalEstimatedApiCost(project),
    renderedAt: project.renderedAt,
    createdAt: project.createdAt,
    lastActiveAt: project.lastUpdated,
    steps: buildSteps(project, channelTitle),
    scenes: buildScenes(project),
    assets: buildAssets(project),
    apiCalls: project.apiCosts.map((call) => ({
      clientCallId: call.id,
      step: call.step,
      tool: call.provider,
      kind: call.kind,
      estimatedUsd: call.usd,
      ok: true,
      latencyMs: null,
      at: call.at,
    })),
    checks: buildChecks(project),
    references: buildReferences(project),
  };
}
