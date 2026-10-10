import { exportProjectWithRemotion, type ExportResult } from "@/lib/exportRemotion";
import { buildSceneVoiceovers, type ExportVoiceProvider } from "@/lib/exportVoiceover";
import type { SessionDocuments } from "@/lib/session/stepPayload";
import { projectFromSessionDocuments } from "@/lib/session/stepPayload";
import { totalTimelineSeconds, type VideoProject } from "@/lib/videoProject";

export async function fetchSessionProject(sessionId: string): Promise<VideoProject> {
  const response = await fetch(`/api/create/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(response.status === 404 ? "Project not found." : "Could not load project.");
  }
  const docs = (await response.json()) as SessionDocuments;
  const project = projectFromSessionDocuments(docs);
  if (!project) throw new Error("This project has no saved steps yet.");
  return project;
}

export async function renderSessionProject(
  project: VideoProject,
  provider: ExportVoiceProvider,
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: number, message: string) => void;
  },
): Promise<ExportResult> {
  if (project.scenes.length === 0) {
    throw new Error("Add timeline scenes before scheduling.");
  }
  options.onProgress?.(0.02, "Preparing voiceover…");
  const voiceovers = await buildSceneVoiceovers(project, provider, {
    signal: options.signal,
    onScene: (done, total) => {
      options.onProgress?.(0.02 + (done / total) * 0.28, `Speaking ${done} of ${total}…`);
    },
  });
  const scenesWithVoice = project.scenes.map((scene) => {
    const length = voiceovers.seconds[scene.id];
    if (!length) return scene;
    return { ...scene, editing: { ...scene.editing, voiceSeconds: length } };
  });
  const withVoice = { ...project, scenes: scenesWithVoice };
  try {
    const result = await exportProjectWithRemotion(withVoice, {
      signal: options.signal,
      download: false,
      voiceoverUrls: voiceovers.bySceneId,
      voiceoverSeconds: voiceovers.seconds,
      onProgress: ({ progress }) => {
        options.onProgress?.(0.3 + progress * 0.65, `Encoding ${Math.round(progress * 100)}%…`);
      },
    });
    options.onProgress?.(1, "Export complete");
    return result;
  } finally {
    voiceovers.revoke();
  }
}

export function projectRuntimeLabel(project: VideoProject): string {
  const sec = totalTimelineSeconds(project.scenes);
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `0:${String(s).padStart(2, "0")}`;
}
