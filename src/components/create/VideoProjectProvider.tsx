"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { StepFixModal } from "@/components/create/StepFixModal";
import { useVideoProjectDraft, upsertProjectInStore } from "@/lib/useVideoProjectDraft";
import { mapActionToEvents } from "@/lib/session/events";
import { buildSnapshot } from "@/lib/session/snapshot";
import {
  mergeApiCosts,
  projectFromSessionDocuments,
  shouldPreferServerDocuments,
  type SessionDocuments,
} from "@/lib/session/stepPayload";
import {
  applyLaterSteps,
  captureLaterStepsCommit,
  laterStepMatches,
  withLaterStep,
  type LaterStepId,
  type LaterStepsCommit,
} from "@/lib/session/laterStepCommit";
import {
  captureSummaryCommit,
  captureTitleCommit,
  projectForDatabase,
  summaryCommitMatches,
  titleCommitMatches,
  type SummaryCommit,
  type TitleCommit,
} from "@/lib/session/summaryCommit";
import {
  flushSnapshotSync,
  scheduleSnapshotSync,
  trackSessionEvent,
} from "@/lib/session/telemetry";
import { MAX_TRANSCRIPT_CHARS } from "@/lib/youtube/transcript";
import type { ConnectedChannel } from "@/lib/youtube/repo";
import {
  applySummaryPatch,
  cloneScene,
  createEmptyScene,
  DEFAULT_PROJECT_NAME,
  DEFAULT_STEP,
  emptyEditorSettings,
  inferStepStatus,
  normalizeElevenLabsVoice,
  isStepId,
  newId,
  reindexScenes,
  sceneDuration,
  type AiProvider,
  type ApiCostEntry,
  type EditorSettings,
  type ElevenLabsVoice,
  type LowEffortReport,
  type Scene,
  type ScriptScore,
  type StepId,
  type StepStatus,
  type ThumbnailOption,
  type TitleOption,
  type TitleScore,
  type VideoProject,
  type VidIqThumbInsight,
} from "@/lib/videoProject";

type ScenePatch = Partial<Omit<Scene, "voiceover" | "visuals" | "editing">> & {
  voiceover?: Partial<Scene["voiceover"]>;
  visuals?: Partial<Scene["visuals"]>;
  editing?: Partial<Scene["editing"]>;
};

export type ProjectAction =
  | { type: "HYDRATE"; project: VideoProject | null }
  | { type: "SET_NAME"; name: string }
  | { type: "SET_CHANNEL"; channelId: string }
  | { type: "UPDATE_SUMMARY"; patch: Partial<VideoProject["summary"]> }
  | { type: "SET_TITLES"; titles: TitleOption[]; cursorPrompt?: string | null }
  | { type: "ADD_TITLES"; titles: TitleOption[] }
  | { type: "REMOVE_TITLE"; id: string }
  | { type: "SELECT_TITLE"; id: string }
  | { type: "EDIT_TITLE"; id: string; text: string }
  | { type: "REPLACE_TITLE"; id: string; title: TitleOption }
  | { type: "SET_THUMBNAILS"; thumbnails: ThumbnailOption[]; cursorPrompt?: string | null }
  | { type: "SELECT_THUMBNAIL"; id: string }
  | { type: "ADD_THUMBNAIL"; thumbnail: ThumbnailOption }
  | { type: "REPLACE_THUMBNAIL"; id: string; thumbnail: ThumbnailOption }
  | { type: "SET_TITLE_SCORES"; scores: Record<string, TitleScore> }
  | { type: "SET_THUMBNAIL_INSIGHTS"; insights: Record<string, VidIqThumbInsight> }
  | { type: "SET_SCRIPT_SCORE"; score: ScriptScore }
  | { type: "SET_SCRIPT"; script: string; cursorPrompt?: string | null; generated?: boolean }
  | { type: "SET_SCENES"; scenes: Scene[]; generated?: boolean; keepStatus?: boolean }
  | { type: "ADD_SCENE" }
  | { type: "DELETE_SCENE"; id: string }
  | { type: "MOVE_SCENE"; id: string; direction: "up" | "down" }
  | { type: "PATCH_SCENE"; id: string; patch: ScenePatch }
  | { type: "SET_DESCRIPTION"; description: string; tags?: string[] }
  | { type: "SET_PROVIDER"; step: StepId; provider: AiProvider }
  | { type: "SET_STEP_STATUS"; step: StepId; status: StepStatus }
  | { type: "RECORD_API_COST"; entry: ApiCostEntry }
  | { type: "MARK_RENDERED" }
  | { type: "SPLIT_SCENE"; id: string; atSeconds: number }
  | { type: "DUPLICATE_SCENE"; id: string }
  | { type: "UPDATE_EDITOR"; patch: Partial<EditorSettings> }
  | { type: "CONFIRM_EDIT" }
  | { type: "SET_LOW_EFFORT_REPORT"; report: LowEffortReport }
  | { type: "SET_ELEVENLABS_VOICE"; voice: ElevenLabsVoice | null };

function applyScenePatch(scene: Scene, patch: ScenePatch): Scene {
  return {
    ...scene,
    ...patch,
    voiceover: { ...scene.voiceover, ...patch.voiceover },
    visuals: { ...scene.visuals, ...patch.visuals },
    editing: { ...scene.editing, ...patch.editing },
  };
}

function sameThumbnailIds(current: ThumbnailOption[], next: ThumbnailOption[]): boolean {
  if (current.length !== next.length || current.length === 0) return false;
  const ids = new Set(current.map((item) => item.id));
  return next.every((item) => ids.has(item.id));
}

function reduceProject(
  state: VideoProject,
  action: Exclude<ProjectAction, { type: "HYDRATE" }>,
): VideoProject {
  switch (action.type) {
    case "SET_NAME":
      return { ...state, name: action.name };
    case "SET_CHANNEL":
      return { ...state, channelId: action.channelId };
    case "UPDATE_SUMMARY":
      return { ...state, summary: applySummaryPatch(state.summary, action.patch) };
    case "SET_TITLES":
      return {
        ...state,
        titles: action.titles,
        selectedTitleId: null,
        cursorTitlePrompt:
          action.cursorPrompt === undefined ? state.cursorTitlePrompt : action.cursorPrompt,
      };
    case "ADD_TITLES":
      return { ...state, titles: [...state.titles, ...action.titles] };
    case "REMOVE_TITLE":
      return {
        ...state,
        titles: state.titles.filter((title) => title.id !== action.id),
        selectedTitleId: state.selectedTitleId === action.id ? null : state.selectedTitleId,
      };
    case "SELECT_TITLE":
      return { ...state, selectedTitleId: action.id };
    case "EDIT_TITLE":
      return {
        ...state,
        titles: state.titles.map((title) =>
          title.id === action.id
            ? { ...title, text: action.text, score: undefined, vidiq: undefined }
            : { ...title, score: undefined, vidiq: undefined },
        ),
      };
    case "REPLACE_TITLE":
      return {
        ...state,
        titles: state.titles.map((title) =>
          title.id === action.id
            ? { ...action.title, score: undefined, vidiq: undefined }
            : { ...title, score: undefined, vidiq: undefined },
        ),
      };
    case "SET_THUMBNAILS":
      return {
        ...state,
        thumbnails: action.thumbnails,
        selectedThumbnailId: sameThumbnailIds(state.thumbnails, action.thumbnails)
          ? state.selectedThumbnailId
          : null,
        cursorThumbnailPrompt:
          action.cursorPrompt === undefined ? state.cursorThumbnailPrompt : action.cursorPrompt,
      };
    case "SELECT_THUMBNAIL":
      return { ...state, selectedThumbnailId: action.id };
    case "ADD_THUMBNAIL":
      return {
        ...state,
        thumbnails: [action.thumbnail, ...state.thumbnails],
        selectedThumbnailId: action.thumbnail.id,
      };
    case "REPLACE_THUMBNAIL":
      return {
        ...state,
        thumbnails: state.thumbnails.map((thumb) =>
          thumb.id === action.id ? action.thumbnail : thumb,
        ),
      };
    case "SET_TITLE_SCORES":
      return {
        ...state,
        titles: state.titles
          .map((title, index) => ({
            title: {
              ...title,
              score: action.scores[title.id],
              vidiq: undefined,
            },
            originalIndex: index,
          }))
          .sort(
            (a, b) =>
              (a.title.score?.rank ?? Number.MAX_SAFE_INTEGER) -
                (b.title.score?.rank ?? Number.MAX_SAFE_INTEGER) ||
              (b.title.score?.score ?? -1) - (a.title.score?.score ?? -1) ||
              a.originalIndex - b.originalIndex,
          )
          .map((item) => item.title),
      };
    case "SET_THUMBNAIL_INSIGHTS":
      return {
        ...state,
        thumbnails: state.thumbnails.map((thumb) => {
          const insight = action.insights[thumb.id];
          return insight ? { ...thumb, vidiq: insight } : thumb;
        }),
      };
    case "SET_SCRIPT_SCORE":
      return { ...state, scriptScore: action.score, scriptVidiq: undefined };
    case "SET_SCRIPT":
      return {
        ...state,
        fullScript: action.script,
        cursorScriptPrompt:
          action.cursorPrompt === undefined ? state.cursorScriptPrompt : action.cursorPrompt,
      };
    case "SET_SCENES":
      return { ...state, scenes: reindexScenes(action.scenes) };
    case "ADD_SCENE": {
      const scene = createEmptyScene(state.scenes.length);
      return { ...state, scenes: [...state.scenes, scene] };
    }
    case "DELETE_SCENE":
      return {
        ...state,
        scenes: reindexScenes(state.scenes.filter((scene) => scene.id !== action.id)),
      };
    case "MOVE_SCENE": {
      const index = state.scenes.findIndex((scene) => scene.id === action.id);
      if (index < 0) return state;
      const target = action.direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= state.scenes.length) return state;
      const next = [...state.scenes];
      const current = next[index];
      const swap = next[target];
      if (!current || !swap) return state;
      next[index] = swap;
      next[target] = current;
      return { ...state, scenes: reindexScenes(next) };
    }
    case "PATCH_SCENE":
      return {
        ...state,
        scenes: state.scenes.map((scene) =>
          scene.id === action.id ? applyScenePatch(scene, action.patch) : scene,
        ),
      };
    case "SET_DESCRIPTION":
      return {
        ...state,
        description: action.description,
        tags: action.tags ?? state.tags,
      };
    case "SET_PROVIDER":
      return {
        ...state,
        providerByStep: { ...state.providerByStep, [action.step]: action.provider },
      };
    case "SET_STEP_STATUS":
      return {
        ...state,
        stepStatus: { ...state.stepStatus, [action.step]: action.status },
      };
    case "RECORD_API_COST":
      return {
        ...state,
        apiCosts: [...(state.apiCosts ?? []), action.entry],
      };
    case "MARK_RENDERED":
      return {
        ...state,
        renderedAt: new Date().toISOString(),
        editor: {
          ...(state.editor ?? emptyEditorSettings()),
          confirmedAt: null,
          exportedAt: null,
        },
      };
    case "SPLIT_SCENE": {
      const index = state.scenes.findIndex((scene) => scene.id === action.id);
      const scene = state.scenes[index];
      if (!scene) return state;
      const duration = sceneDuration(scene);
      if (duration < 2) return state;
      const at = Math.min(duration - 1, Math.max(1, Math.round(action.atSeconds)));
      if (at < 1 || at >= duration) return state;
      const left = applyScenePatch(scene, {
        editing: { durationSeconds: at },
      });
      const right = cloneScene(scene, index + 1);
      right.editing.durationSeconds = duration - at;
      right.sectionLabel = `${scene.sectionLabel} (b)`;
      const next = [...state.scenes];
      next.splice(index, 1, left, right);
      return { ...state, scenes: reindexScenes(next) };
    }
    case "DUPLICATE_SCENE": {
      const index = state.scenes.findIndex((scene) => scene.id === action.id);
      const scene = state.scenes[index];
      if (!scene) return state;
      const copy = cloneScene(scene, index + 1);
      copy.sectionLabel = `${scene.sectionLabel} copy`;
      const next = [...state.scenes];
      next.splice(index + 1, 0, copy);
      return { ...state, scenes: reindexScenes(next) };
    }
    case "UPDATE_EDITOR":
      return {
        ...state,
        editor: { ...(state.editor ?? emptyEditorSettings()), ...action.patch },
      };
    case "CONFIRM_EDIT":
      return {
        ...state,
        editor: {
          ...(state.editor ?? emptyEditorSettings()),
          confirmedAt: new Date().toISOString(),
        },
      };
    case "SET_LOW_EFFORT_REPORT":
      return {
        ...state,
        lowEffortByStep: {
          ...(state.lowEffortByStep ?? {}),
          [action.report.scope]: action.report,
        },
      };
    case "SET_ELEVENLABS_VOICE":
      return {
        ...state,
        elevenLabsVoice: normalizeElevenLabsVoice(action.voice),
      };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

function reducer(state: VideoProject | null, action: ProjectAction): VideoProject | null {
  if (action.type === "HYDRATE") return action.project;
  if (!state) return state;
  const reduced = reduceProject(state, action);
  const withStatus =
    action.type === "SET_STEP_STATUS"
      ? reduced
      : { ...reduced, stepStatus: inferStepStatus(reduced) };
  return { ...withStatus, lastUpdated: new Date().toISOString() };
}

type ProjectContextValue = {
  project: VideoProject;
  savedAt: string | null;
  dispatch: (action: ProjectAction) => void;
  previewOpen: boolean;
  setPreviewOpen: (open: boolean) => void;
  activeStep: StepId;
  setActiveStep: (step: StepId) => void;
  summaryNeedsSave: boolean;
  titleNeedsSave: boolean;
  needsSaveByStep: Record<StepId, boolean>;
  summarySaving: boolean;
  summarySaveError: string | null;
  approveNotice: { step: StepId; title: string; message: string } | null;
  dismissApproveNotice: () => void;
  savedSummary: SummaryCommit | null;
  savedTitle: TitleCommit | null;
  deleteSummaryReference: (referenceId: string) => void;
};

function projectSavedToDatabase(
  project: VideoProject,
  summary: SummaryCommit,
  title: TitleCommit,
  later: LaterStepsCommit,
): VideoProject {
  return applyLaterSteps(projectForDatabase(project, summary, title), later);
}

const LATER_APPROVE_STEPS = new Set<LaterStepId>([
  "thumbnail",
  "script",
  "timeline",
  "description",
  "render",
]);

function isLaterApproveStep(step: StepId): step is Exclude<LaterStepId, "editor"> {
  return LATER_APPROVE_STEPS.has(step as LaterStepId);
}

const UNSAVED_SUMMARY_EVENTS = new Set([
  "summary.changed",
  "summary.reference_added",
  "summary.reference_removed",
]);

async function commitSummaryReferences(
  sessionId: string,
  references: VideoProject["summary"]["references"],
): Promise<boolean> {
  try {
    const response = await fetch(
      `/api/create/sessions/${encodeURIComponent(sessionId)}/references`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "commit",
          references: references.map((reference, order) => ({
            referenceKey: reference.id,
            order,
            url: reference.url.trim(),
            title: reference.title.trim().slice(0, 200),
            transcript: reference.transcript.slice(0, MAX_TRANSCRIPT_CHARS),
            lang: reference.lang,
            source: reference.transcriptSource === "fetched" ? "fetched" : "manual",
            fetchedAt: reference.fetchedAt,
          })),
        }),
      },
    );
    return response.ok;
  } catch (error) {
    console.error("[video-session] video intro reference save failed", error);
    return false;
  }
}

const VideoProjectContext = createContext<ProjectContextValue | null>(null);

const STEP_PARAM = "step";

export function VideoProjectProvider({
  projectId,
  channels,
  children,
  fallback,
  missing,
}: {
  projectId: string;
  channels: ConnectedChannel[];
  children: ReactNode;
  fallback: ReactNode;
  missing: ReactNode;
}) {
  const { hydrated, initial, persist, savedAt } = useVideoProjectDraft(projectId);
  const [project, rawDispatch] = useReducer(reducer, null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [sourceResolved, setSourceResolved] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [summaryCommit, setSummaryCommit] = useState<SummaryCommit | null>(null);
  const [titleCommit, setTitleCommit] = useState<TitleCommit | null>(null);
  const [laterCommit, setLaterCommit] = useState<LaterStepsCommit | null>(null);
  const [summarySaving, setSummarySaving] = useState(false);
  const [summarySaveError, setSummarySaveError] = useState<string | null>(null);
  const [approveNotice, setApproveNotice] = useState<{
    step: StepId;
    title: string;
    message: string;
  } | null>(null);
  const dismissApproveNotice = useCallback(() => setApproveNotice(null), []);
  const openedIdRef = useRef<string | null>(null);
  const localAtLoadRef = useRef<VideoProject | null>(null);
  const summaryCommitRef = useRef<SummaryCommit | null>(null);
  const titleCommitRef = useRef<TitleCommit | null>(null);
  const laterCommitRef = useRef<LaterStepsCommit | null>(null);
  const summarySavingRef = useRef(false);
  const commitTokenRef = useRef(0);

  // The URL owns the step, so refresh, back/forward and shared links all land
  // on the same place. An unknown or missing value reads as the first step.
  const searchParams = useSearchParams();
  const stepParam = searchParams.get(STEP_PARAM);
  const activeStep: StepId = isStepId(stepParam) ? stepParam : DEFAULT_STEP;

  const setActiveStep = useCallback((step: StepId) => {
    const params = new URLSearchParams(window.location.search);
    if (step === DEFAULT_STEP) params.delete(STEP_PARAM);
    else params.set(STEP_PARAM, step);
    const query = params.toString();
    // Native history keeps this workspace mounted; router.push would re-run the
    // force-dynamic page (and its channel query) on every step change.
    window.history.pushState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
    if (project) {
      trackSessionEvent(project.id, {
        type: "step.entered",
        step,
        payload: { previousStep: activeStep },
      });
    }
  }, [project, activeStep]);

  const commitSummaryStatus = useCallback((status: StepStatus) => {
    const current = project;
    if (!current || summarySavingRef.current) return;
    const previousCommit = summaryCommitRef.current ?? captureSummaryCommit(current);
    const nextCommit: SummaryCommit = status === "approved"
      ? captureSummaryCommit({
          ...current,
          stepStatus: { ...current.stepStatus, summary: status },
        })
      : { ...previousCommit, stepStatus: status };
    const token = commitTokenRef.current + 1;
    commitTokenRef.current = token;
    summarySavingRef.current = true;
    summaryCommitRef.current = nextCommit;
    setSummaryCommit(nextCommit);
    setSummarySaving(true);
    setSummarySaveError(null);
    rawDispatch({ type: "SET_STEP_STATUS", step: "summary", status });

    const channelTitle = channels.find((channel) => channel.id === nextCommit.channelId)?.title ?? null;
    const stored = projectSavedToDatabase(
      {
        ...current,
        stepStatus: { ...current.stepStatus, summary: status },
        lastUpdated: new Date().toISOString(),
      },
      nextCommit,
      titleCommitRef.current ?? captureTitleCommit(current),
      laterCommitRef.current ?? captureLaterStepsCommit(current),
    );

    void (async () => {
      const result = await flushSnapshotSync(buildSnapshot(stored, activeStep, channelTitle));
      if (commitTokenRef.current !== token) return;
      if (result !== "ok") {
        summaryCommitRef.current = previousCommit;
        setSummaryCommit(previousCommit);
        setSummarySaveError("Save failed. Click Mark approved again.");
        rawDispatch({ type: "SET_STEP_STATUS", step: "summary", status: previousCommit.stepStatus });
        summarySavingRef.current = false;
        setSummarySaving(false);
        return;
      }
      const referencesSaved = status === "approved"
        ? await commitSummaryReferences(current.id, nextCommit.summary.references)
        : true;
      if (commitTokenRef.current !== token) return;
      if (!referencesSaved) {
        summaryCommitRef.current = previousCommit;
        setSummaryCommit(previousCommit);
        setSummarySaveError("Save failed. Click Mark approved again.");
        rawDispatch({ type: "SET_STEP_STATUS", step: "summary", status: previousCommit.stepStatus });
      } else {
        trackSessionEvent(current.id, {
          type: status === "approved" ? "step.approved" : "step.state_changed",
          step: "summary",
          payload: { status, previousStatus: previousCommit.stepStatus },
        });
      }
      summarySavingRef.current = false;
      setSummarySaving(false);
    })();
  }, [project, channels, activeStep]);

  const deleteSummaryReference = useCallback((referenceId: string) => {
    const current = project;
    if (!current) return;
    const nextReferences = current.summary.references.filter((item) => item.id !== referenceId);
    if (nextReferences.length === current.summary.references.length) return;

    rawDispatch({ type: "UPDATE_SUMMARY", patch: { references: nextReferences } });

    const commit = summaryCommitRef.current;
    const wasSaved = commit?.summary.references.some((item) => item.id === referenceId) ?? false;
    if (!commit || !wasSaved) return;

    const previousCommit = commit;
    const nextCommit: SummaryCommit = {
      ...commit,
      summary: {
        ...commit.summary,
        references: commit.summary.references.filter((item) => item.id !== referenceId),
      },
    };
    commitTokenRef.current += 1;
    const token = commitTokenRef.current;
    if (summarySavingRef.current) {
      summarySavingRef.current = false;
      setSummarySaving(false);
    }
    summaryCommitRef.current = nextCommit;
    setSummaryCommit(nextCommit);

    const channelTitle = channels.find((channel) => channel.id === nextCommit.channelId)?.title ?? null;
    const stored = projectSavedToDatabase(
      { ...current, lastUpdated: new Date().toISOString() },
      nextCommit,
      titleCommitRef.current ?? captureTitleCommit(current),
      laterCommitRef.current ?? captureLaterStepsCommit(current),
    );
    void (async () => {
      const result = await flushSnapshotSync(buildSnapshot(stored, activeStep, channelTitle));
      if (commitTokenRef.current !== token) return;
      if (result !== "ok") {
        summaryCommitRef.current = previousCommit;
        setSummaryCommit(previousCommit);
        rawDispatch({
          type: "UPDATE_SUMMARY",
          patch: { references: current.summary.references },
        });
        setSummarySaveError("Could not delete that reference.");
      }
    })();
  }, [project, channels, activeStep]);

  const persistGeneratedTitles = useCallback((action: Extract<ProjectAction, { type: "SET_TITLES" }>) => {
    const current = project;
    if (!current) return;
    const summary = summaryCommitRef.current ?? captureSummaryCommit(current);
    const previousCommit = titleCommitRef.current ?? captureTitleCommit(current);
    const cursorTitlePrompt =
      action.cursorPrompt === undefined ? current.cursorTitlePrompt : action.cursorPrompt;
    const nextCommit: TitleCommit = {
      titles: structuredClone(action.titles),
      selectedTitleId: null,
      cursorTitlePrompt: typeof cursorTitlePrompt === "string" ? cursorTitlePrompt : null,
      provider: current.providerByStep.title,
      stepStatus: "generated",
    };
    const token = commitTokenRef.current + 1;
    commitTokenRef.current = token;
    titleCommitRef.current = nextCommit;
    setTitleCommit(nextCommit);
    rawDispatch(action);
    rawDispatch({ type: "SET_STEP_STATUS", step: "title", status: "generated" });

    const channelTitle = channels.find((channel) => channel.id === summary.channelId)?.title ?? null;
    const stored = projectSavedToDatabase(
      {
        ...current,
        titles: action.titles,
        selectedTitleId: null,
        cursorTitlePrompt: nextCommit.cursorTitlePrompt,
        stepStatus: { ...current.stepStatus, title: "generated" },
        lastUpdated: new Date().toISOString(),
      },
      summary,
      nextCommit,
      laterCommitRef.current ?? captureLaterStepsCommit(current),
    );
    void (async () => {
      const result = await flushSnapshotSync(buildSnapshot(stored, activeStep, channelTitle));
      if (commitTokenRef.current !== token) return;
      if (result !== "ok") {
        titleCommitRef.current = previousCommit;
        setTitleCommit(previousCommit);
        setSummarySaveError("Could not save the generated titles.");
      }
    })();
  }, [project, channels, activeStep]);

  const persistGeneratedThumbnails = useCallback((action: Extract<ProjectAction, { type: "SET_THUMBNAILS" }>) => {
    const current = project;
    if (!current) return;
    const summary = summaryCommitRef.current ?? captureSummaryCommit(current);
    const title = titleCommitRef.current ?? captureTitleCommit(current);
    const previousLater = laterCommitRef.current ?? captureLaterStepsCommit(current);
    const cursorThumbnailPrompt =
      action.cursorPrompt === undefined ? current.cursorThumbnailPrompt : action.cursorPrompt;
    const generated: VideoProject = {
      ...current,
      thumbnails: action.thumbnails,
      selectedThumbnailId: sameThumbnailIds(current.thumbnails, action.thumbnails)
        ? current.selectedThumbnailId
        : null,
      cursorThumbnailPrompt: typeof cursorThumbnailPrompt === "string" ? cursorThumbnailPrompt : null,
      stepStatus: { ...current.stepStatus, thumbnail: "generated" },
    };
    const nextLater = withLaterStep(previousLater, generated, "thumbnail", "generated");
    const token = commitTokenRef.current + 1;
    commitTokenRef.current = token;
    laterCommitRef.current = nextLater;
    setLaterCommit(nextLater);
    rawDispatch(action);
    rawDispatch({ type: "SET_STEP_STATUS", step: "thumbnail", status: "generated" });

    const channelTitle = channels.find((channel) => channel.id === summary.channelId)?.title ?? null;
    const stored = projectSavedToDatabase(
      { ...generated, lastUpdated: new Date().toISOString() },
      summary,
      title,
      nextLater,
    );
    void (async () => {
      const result = await flushSnapshotSync(buildSnapshot(stored, activeStep, channelTitle));
      if (commitTokenRef.current !== token) return;
      if (result !== "ok") {
        laterCommitRef.current = previousLater;
        setLaterCommit(previousLater);
        setSummarySaveError("Could not save the generated prompts.");
      }
    })();
  }, [project, channels, activeStep]);

  const persistGeneratedScript = useCallback((action: Extract<ProjectAction, { type: "SET_SCRIPT" }>) => {
    const current = project;
    if (!current) return;
    const summary = summaryCommitRef.current ?? captureSummaryCommit(current);
    const title = titleCommitRef.current ?? captureTitleCommit(current);
    const previousLater = laterCommitRef.current ?? captureLaterStepsCommit(current);
    const cursorScriptPrompt =
      action.cursorPrompt === undefined ? current.cursorScriptPrompt : action.cursorPrompt;
    const fire = {
      id: newId(),
      at: new Date().toISOString(),
      step: "script" as const,
      provider: "cursor",
      kind: "script",
      usd: 0,
    };
    const generated: VideoProject = {
      ...current,
      fullScript: action.script,
      cursorScriptPrompt: typeof cursorScriptPrompt === "string" ? cursorScriptPrompt : null,
      apiCosts: [...(current.apiCosts ?? []), fire],
      stepStatus: { ...current.stepStatus, script: "generated" },
    };
    const nextLater = withLaterStep(previousLater, generated, "script", "generated");
    const token = commitTokenRef.current + 1;
    commitTokenRef.current = token;
    laterCommitRef.current = nextLater;
    setLaterCommit(nextLater);
    rawDispatch({ type: "SET_SCRIPT", script: action.script, cursorPrompt: action.cursorPrompt });
    rawDispatch({ type: "RECORD_API_COST", entry: fire });
    rawDispatch({ type: "SET_STEP_STATUS", step: "script", status: "generated" });

    const channelTitle = channels.find((channel) => channel.id === summary.channelId)?.title ?? null;
    const stored = projectSavedToDatabase(
      { ...generated, lastUpdated: new Date().toISOString() },
      summary,
      title,
      nextLater,
    );
    void (async () => {
      const result = await flushSnapshotSync(buildSnapshot(stored, activeStep, channelTitle));
      if (commitTokenRef.current !== token) return;
      if (result !== "ok") {
        laterCommitRef.current = previousLater;
        setLaterCommit(previousLater);
        setSummarySaveError("Could not save the generated script.");
      }
    })();
  }, [project, channels, activeStep]);

  const persistGeneratedScenes = useCallback((action: Extract<ProjectAction, { type: "SET_SCENES" }>) => {
    const current = project;
    if (!current) return;
    const summary = summaryCommitRef.current ?? captureSummaryCommit(current);
    const title = titleCommitRef.current ?? captureTitleCommit(current);
    const previousLater = laterCommitRef.current ?? captureLaterStepsCommit(current);
    const scenes = reindexScenes(action.scenes);
    const currentStatus = current.stepStatus.timeline;
    const status =
      action.keepStatus && (currentStatus === "approved" || currentStatus === "generated")
        ? currentStatus
        : "generated";
    const generated: VideoProject = {
      ...current,
      scenes,
      stepStatus: { ...current.stepStatus, timeline: status },
    };
    const nextLater = withLaterStep(previousLater, generated, "timeline", status);
    const token = commitTokenRef.current + 1;
    commitTokenRef.current = token;
    laterCommitRef.current = nextLater;
    setLaterCommit(nextLater);
    rawDispatch({ type: "SET_SCENES", scenes });
    rawDispatch({ type: "SET_STEP_STATUS", step: "timeline", status });

    const channelTitle = channels.find((channel) => channel.id === summary.channelId)?.title ?? null;
    const stored = projectSavedToDatabase(
      { ...generated, lastUpdated: new Date().toISOString() },
      summary,
      title,
      nextLater,
    );
    void (async () => {
      const result = await flushSnapshotSync(buildSnapshot(stored, activeStep, channelTitle));
      if (commitTokenRef.current !== token) return;
      if (result !== "ok") {
        laterCommitRef.current = previousLater;
        setLaterCommit(previousLater);
        setSummarySaveError("Could not save the scenes.");
      }
    })();
  }, [project, channels, activeStep]);

  const persistStoredThumbnail = useCallback((
    action: Extract<ProjectAction, { type: "REPLACE_THUMBNAIL" } | { type: "ADD_THUMBNAIL" }>,
  ) => {
    const imageUrl = action.thumbnail.customUrl;
    if (!imageUrl?.startsWith("https://")) {
      rawDispatch(action);
      return;
    }
    const current = project;
    if (!current) return;
    const summary = summaryCommitRef.current ?? captureSummaryCommit(current);
    const title = titleCommitRef.current ?? captureTitleCommit(current);
    const previousLater = laterCommitRef.current ?? captureLaterStepsCommit(current);
    const thumbnails = action.type === "REPLACE_THUMBNAIL"
      ? (previousLater.thumbnail.thumbnails.some((item) => item.id === action.id)
          ? previousLater.thumbnail.thumbnails
          : current.thumbnails
        ).map((item) => (item.id === action.id ? action.thumbnail : item))
      : [
          action.thumbnail,
          ...previousLater.thumbnail.thumbnails.filter((item) => item.id !== action.thumbnail.id),
        ];
    const storedProject: VideoProject = {
      ...current,
      thumbnails,
      selectedThumbnailId:
        action.type === "ADD_THUMBNAIL"
          ? action.thumbnail.id
          : previousLater.thumbnail.selectedThumbnailId,
      cursorThumbnailPrompt: previousLater.thumbnail.cursorThumbnailPrompt,
      stepStatus: { ...current.stepStatus, thumbnail: previousLater.thumbnail.stepStatus },
    };
    const nextLater = withLaterStep(
      previousLater,
      storedProject,
      "thumbnail",
      previousLater.thumbnail.stepStatus,
    );
    const token = commitTokenRef.current + 1;
    commitTokenRef.current = token;
    laterCommitRef.current = nextLater;
    setLaterCommit(nextLater);
    rawDispatch(action);

    const channelTitle = channels.find((channel) => channel.id === summary.channelId)?.title ?? null;
    const stored = projectSavedToDatabase(
      { ...storedProject, lastUpdated: new Date().toISOString() },
      summary,
      title,
      nextLater,
    );
    void (async () => {
      const result = await flushSnapshotSync(buildSnapshot(stored, activeStep, channelTitle));
      if (commitTokenRef.current !== token) return;
      if (result !== "ok") {
        laterCommitRef.current = previousLater;
        setLaterCommit(previousLater);
        setSummarySaveError("Could not save the uploaded image.");
      }
    })();
  }, [project, channels, activeStep]);

  const persistElevenLabsVoice = useCallback((voice: ElevenLabsVoice | null) => {
    const current = project;
    if (!current) return;
    const nextVoice = normalizeElevenLabsVoice(voice);
    const summary = summaryCommitRef.current ?? captureSummaryCommit(current);
    const title = titleCommitRef.current ?? captureTitleCommit(current);
    const previousLater = laterCommitRef.current ?? captureLaterStepsCommit(current);
    const nextLater: LaterStepsCommit = {
      ...previousLater,
      timeline: {
        ...previousLater.timeline,
        elevenLabsVoice: nextVoice,
      },
    };
    const token = commitTokenRef.current + 1;
    commitTokenRef.current = token;
    laterCommitRef.current = nextLater;
    setLaterCommit(nextLater);
    rawDispatch({ type: "SET_ELEVENLABS_VOICE", voice: nextVoice });

    const channelTitle = channels.find((channel) => channel.id === summary.channelId)?.title ?? null;
    const stored = projectSavedToDatabase(
      { ...current, elevenLabsVoice: nextVoice, lastUpdated: new Date().toISOString() },
      summary,
      title,
      nextLater,
    );
    void (async () => {
      const result = await flushSnapshotSync(buildSnapshot(stored, activeStep, channelTitle));
      if (commitTokenRef.current !== token) return;
      if (result !== "ok") {
        laterCommitRef.current = previousLater;
        setLaterCommit(previousLater);
        rawDispatch({ type: "SET_ELEVENLABS_VOICE", voice: current.elevenLabsVoice ?? null });
        setSummarySaveError("Could not save the ElevenLabs voice.");
      }
    })();
  }, [project, channels, activeStep]);

  const commitTitleStatus = useCallback((status: StepStatus) => {
    const current = project;
    if (!current || summarySavingRef.current) return;
    const previousCommit = titleCommitRef.current ?? captureTitleCommit(current);
    const summary = summaryCommitRef.current ?? captureSummaryCommit(current);
    const selected = current.titles.find(
      (title) => title.id === current.selectedTitleId && title.text.trim(),
    );
    if (status === "approved" && !selected) {
      setApproveNotice({
        step: "title",
        title: "No title selected",
        message: "Select one title before marking this step approved.",
      });
      return;
    }
    const nextCommit: TitleCommit = captureTitleCommit({
      ...current,
      stepStatus: { ...current.stepStatus, title: status },
    });
    const token = commitTokenRef.current + 1;
    commitTokenRef.current = token;
    summarySavingRef.current = true;
    titleCommitRef.current = nextCommit;
    setTitleCommit(nextCommit);
    setSummarySaving(true);
    setSummarySaveError(null);
    rawDispatch({ type: "SET_STEP_STATUS", step: "title", status });

    const channelTitle = channels.find((channel) => channel.id === summary.channelId)?.title ?? null;
    const stored = projectSavedToDatabase(
      {
        ...current,
        stepStatus: { ...current.stepStatus, title: status },
        lastUpdated: new Date().toISOString(),
      },
      summary,
      nextCommit,
      laterCommitRef.current ?? captureLaterStepsCommit(current),
    );

    void (async () => {
      const result = await flushSnapshotSync(buildSnapshot(stored, activeStep, channelTitle));
      if (commitTokenRef.current !== token) return;
      if (result !== "ok") {
        titleCommitRef.current = previousCommit;
        setTitleCommit(previousCommit);
        setSummarySaveError("Save failed. Click Mark approved again.");
        rawDispatch({ type: "SET_STEP_STATUS", step: "title", status: previousCommit.stepStatus });
      } else {
        trackSessionEvent(current.id, {
          type: status === "approved" ? "step.approved" : "step.state_changed",
          step: "title",
          payload: { status, previousStatus: previousCommit.stepStatus },
        });
      }
      summarySavingRef.current = false;
      setSummarySaving(false);
    })();
  }, [project, channels, activeStep]);

  const commitLaterStatus = useCallback((step: Exclude<LaterStepId, "editor">, status: StepStatus) => {
    const current = project;
    if (!current || summarySavingRef.current) return;
    const previousCommit = laterCommitRef.current ?? captureLaterStepsCommit(current);
    const summary = summaryCommitRef.current ?? captureSummaryCommit(current);
    const title = titleCommitRef.current ?? captureTitleCommit(current);
    if (step === "thumbnail" && status === "approved") {
      const selected = current.thumbnails.find(
        (thumb) => thumb.id === current.selectedThumbnailId && thumb.concept.trim(),
      );
      if (!selected) {
        setApproveNotice({
          step: "thumbnail",
          title: "No prompt selected",
          message: "Select one thumbnail prompt before marking this step approved.",
        });
        return;
      }
    }
    if (step === "script" && status === "approved" && !current.fullScript.trim()) {
      setApproveNotice({
        step: "script",
        title: "No script yet",
        message: "Generate or write a script before marking this step approved.",
      });
      return;
    }
    const nextCommit = withLaterStep(previousCommit, current, step, status);
    const token = commitTokenRef.current + 1;
    commitTokenRef.current = token;
    summarySavingRef.current = true;
    laterCommitRef.current = nextCommit;
    setLaterCommit(nextCommit);
    setSummarySaving(true);
    setSummarySaveError(null);
    rawDispatch({ type: "SET_STEP_STATUS", step, status });

    const channelTitle = channels.find((channel) => channel.id === summary.channelId)?.title ?? null;
    const stored = projectSavedToDatabase(
      {
        ...current,
        stepStatus: { ...current.stepStatus, [step]: status },
        lastUpdated: new Date().toISOString(),
      },
      summary,
      title,
      nextCommit,
    );

    void (async () => {
      const result = await flushSnapshotSync(buildSnapshot(stored, activeStep, channelTitle));
      if (commitTokenRef.current !== token) return;
      if (result !== "ok") {
        laterCommitRef.current = previousCommit;
        setLaterCommit(previousCommit);
        setSummarySaveError("Save failed. Click Mark approved again.");
        rawDispatch({ type: "SET_STEP_STATUS", step, status: previousCommit[step].stepStatus });
      } else {
        trackSessionEvent(current.id, {
          type: status === "approved" ? "step.approved" : "step.state_changed",
          step,
          payload: { status, previousStatus: previousCommit[step].stepStatus },
        });
      }
      summarySavingRef.current = false;
      setSummarySaving(false);
    })();
  }, [project, channels, activeStep]);

  const commitEditor = useCallback(() => {
    const current = project;
    if (!current || summarySavingRef.current) return;
    const previousCommit = laterCommitRef.current ?? captureLaterStepsCommit(current);
    const summary = summaryCommitRef.current ?? captureSummaryCommit(current);
    const title = titleCommitRef.current ?? captureTitleCommit(current);
    const confirmed: VideoProject = {
      ...current,
      editor: {
        ...(current.editor ?? emptyEditorSettings()),
        confirmedAt: new Date().toISOString(),
      },
    };
    const nextCommit = withLaterStep(previousCommit, confirmed, "editor", "approved");
    const token = commitTokenRef.current + 1;
    commitTokenRef.current = token;
    summarySavingRef.current = true;
    laterCommitRef.current = nextCommit;
    setLaterCommit(nextCommit);
    setSummarySaving(true);
    setSummarySaveError(null);
    rawDispatch({ type: "CONFIRM_EDIT" });

    const channelTitle = channels.find((channel) => channel.id === summary.channelId)?.title ?? null;
    const stored = projectSavedToDatabase(
      { ...confirmed, lastUpdated: new Date().toISOString() },
      summary,
      title,
      nextCommit,
    );

    void (async () => {
      const result = await flushSnapshotSync(buildSnapshot(stored, activeStep, channelTitle));
      if (commitTokenRef.current !== token) return;
      if (result !== "ok") {
        laterCommitRef.current = previousCommit;
        setLaterCommit(previousCommit);
        setSummarySaveError("Save failed. Click Confirm edit again.");
        rawDispatch({
          type: "UPDATE_EDITOR",
          patch: {
            confirmedAt: previousCommit.editor.editor.confirmedAt,
          },
        });
      } else {
        trackSessionEvent(current.id, {
          type: "editor.confirmed",
          step: "editor",
          payload: {},
        });
      }
      summarySavingRef.current = false;
      setSummarySaving(false);
    })();
  }, [project, channels, activeStep]);

  const dispatch = useCallback((action: ProjectAction) => {
    if (action.type === "SET_STEP_STATUS" && action.step === "summary") {
      commitSummaryStatus(action.status);
      return;
    }
    if (action.type === "SET_STEP_STATUS" && action.step === "title") {
      commitTitleStatus(action.status);
      return;
    }
    if (action.type === "SET_TITLES") {
      persistGeneratedTitles(action);
      return;
    }
    if (action.type === "SET_THUMBNAILS") {
      persistGeneratedThumbnails(action);
      return;
    }
    if (action.type === "SET_SCRIPT" && action.generated) {
      persistGeneratedScript(action);
      return;
    }
    if (action.type === "SET_SCENES" && action.generated) {
      persistGeneratedScenes(action);
      return;
    }
    if (action.type === "SET_LOW_EFFORT_REPORT" && project && action.report.scope === "script") {
      const next = {
        ...project,
        lowEffortByStep: {
          ...(project.lowEffortByStep ?? {}),
          script: action.report,
        },
        lastUpdated: new Date().toISOString(),
      };
      rawDispatch(action);
      const later = withLaterStep(
        laterCommitRef.current ?? captureLaterStepsCommit(project),
        next,
        "script",
        project.stepStatus.script,
      );
      laterCommitRef.current = later;
      setLaterCommit(later);
      return;
    }
    if (action.type === "SET_THUMBNAIL_INSIGHTS" && project) {
      const thumbnails = project.thumbnails.map((thumb) => {
        const insight = action.insights[thumb.id];
        return insight ? { ...thumb, vidiq: insight } : thumb;
      });
      const next = { ...project, thumbnails, lastUpdated: new Date().toISOString() };
      rawDispatch(action);
      const later = withLaterStep(
        laterCommitRef.current ?? captureLaterStepsCommit(project),
        next,
        "thumbnail",
        project.stepStatus.thumbnail,
      );
      laterCommitRef.current = later;
      setLaterCommit(later);
      return;
    }
    if (action.type === "REPLACE_THUMBNAIL" || action.type === "ADD_THUMBNAIL") {
      persistStoredThumbnail(action);
      return;
    }
    if (action.type === "SET_STEP_STATUS" && isLaterApproveStep(action.step)) {
      commitLaterStatus(action.step, action.status);
      return;
    }
    if (action.type === "CONFIRM_EDIT") {
      commitEditor();
      return;
    }
    if (action.type === "SET_ELEVENLABS_VOICE") {
      persistElevenLabsVoice(action.voice);
      return;
    }
    if (action.type === "SET_NAME" && project) {
      const name = action.name.trim().slice(0, 120) || DEFAULT_PROJECT_NAME;
      const next = { ...project, name, lastUpdated: new Date().toISOString() };
      rawDispatch({ type: "SET_NAME", name });
      upsertProjectInStore(next);
      const channelTitle = channels.find((channel) => channel.id === project.channelId)?.title ?? null;
      void flushSnapshotSync(buildSnapshot(next, activeStep, channelTitle));
      return;
    }
    if (project && action.type !== "HYDRATE") {
      for (const item of mapActionToEvents(action, project)) {
        if (UNSAVED_SUMMARY_EVENTS.has(item.type)) continue;
        trackSessionEvent(project.id, item);
      }
    }
    rawDispatch(action);
  }, [project, channels, activeStep, commitSummaryStatus, commitTitleStatus, persistGeneratedTitles, persistGeneratedThumbnails, persistGeneratedScript, persistGeneratedScenes, persistStoredThumbnail, persistElevenLabsVoice, commitLaterStatus, commitEditor]);

  if (hydrated && loadedId !== projectId) {
    setLoadedId(projectId);
    setPreviewOpen(false);
    setSourceResolved(false);
    setSummaryCommit(null);
    setTitleCommit(null);
    setLaterCommit(null);
    setSummarySaveError(null);
    rawDispatch({ type: "HYDRATE", project: initial });
  }

  useEffect(() => {
    summaryCommitRef.current = summaryCommit;
  }, [summaryCommit]);

  useEffect(() => {
    titleCommitRef.current = titleCommit;
  }, [titleCommit]);

  useEffect(() => {
    laterCommitRef.current = laterCommit;
  }, [laterCommit]);

  useEffect(() => {
    if (!hydrated || loadedId !== projectId || sourceResolved) return;
    localAtLoadRef.current = initial;
    let cancelled = false;
    let baseline = initial;
    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch(`/api/create/sessions/${encodeURIComponent(projectId)}`, {
          method: "GET",
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
        if (cancelled) return;
        if (response.status === 404 || response.status === 410 || !response.ok) return;
        const docs = (await response.json()) as SessionDocuments;
        if (cancelled) return;
        const local = localAtLoadRef.current;
        if (shouldPreferServerDocuments(local, docs)) {
          const fromServer = projectFromSessionDocuments(docs);
          if (fromServer) {
            fromServer.apiCosts = mergeApiCosts(local?.apiCosts, fromServer.apiCosts);
            baseline = fromServer;
            rawDispatch({ type: "HYDRATE", project: fromServer });
            persist(fromServer);
          }
        }
      } catch (error) {
        if (controller.signal.aborted || cancelled) return;
        console.error("[video-session] documents hydrate failed", error);
      } finally {
        if (!cancelled) {
          if (baseline) {
            const summary = captureSummaryCommit(baseline);
            const title = captureTitleCommit(baseline);
            const later = captureLaterStepsCommit(baseline);
            summaryCommitRef.current = summary;
            titleCommitRef.current = title;
            laterCommitRef.current = later;
            setSummaryCommit(summary);
            setTitleCommit(title);
            setLaterCommit(later);
          }
          setSourceResolved(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [hydrated, loadedId, projectId, sourceResolved, persist, initial]);

  useEffect(() => {
    if (!project || loadedId !== projectId || !sourceResolved || !summaryCommit || !titleCommit || !laterCommit) return;
    persist(projectSavedToDatabase(project, summaryCommit, titleCommit, laterCommit));
  }, [project, persist, loadedId, projectId, sourceResolved, summaryCommit, titleCommit, laterCommit]);

  useEffect(() => {
    if (!project || loadedId !== projectId || !sourceResolved || !summaryCommit || !titleCommit || !laterCommit) return;
    const stored = projectSavedToDatabase(project, summaryCommit, titleCommit, laterCommit);
    const channelTitle = channels.find((channel) => channel.id === stored.channelId)?.title ?? null;
    scheduleSnapshotSync(buildSnapshot(stored, activeStep, channelTitle));
  }, [project, activeStep, channels, loadedId, projectId, sourceResolved, summaryCommit, titleCommit, laterCommit]);

  useEffect(() => {
    if (!project || loadedId !== projectId || !sourceResolved) return;
    if (openedIdRef.current === project.id) return;
    openedIdRef.current = project.id;
    trackSessionEvent(project.id, {
      type: "session.opened",
      step: activeStep,
      payload: {},
    });
  }, [project, activeStep, loadedId, projectId, sourceResolved]);

  const summaryNeedsSave = Boolean(
    project && summaryCommit && !summaryCommitMatches(project, summaryCommit),
  );
  const titleNeedsSave = Boolean(
    project && titleCommit && !titleCommitMatches(project, titleCommit),
  );
  const laterNeedsSave = (step: LaterStepId) =>
    Boolean(project && laterCommit && !laterStepMatches(project, laterCommit, step));
  const needsSaveByStep: Record<StepId, boolean> = {
    summary: summaryNeedsSave,
    title: titleNeedsSave,
    thumbnail: laterNeedsSave("thumbnail"),
    script: laterNeedsSave("script"),
    timeline: laterNeedsSave("timeline"),
    description: laterNeedsSave("description"),
    render: laterNeedsSave("render"),
    editor: laterNeedsSave("editor"),
  };

  if (!hydrated || !sourceResolved) return <>{fallback}</>;
  if (project == null) return <>{missing}</>;
  return (
    <VideoProjectContext.Provider
      value={{
        project,
        savedAt,
        dispatch,
        previewOpen,
        setPreviewOpen,
        activeStep,
        setActiveStep,
        summaryNeedsSave,
        titleNeedsSave,
        needsSaveByStep,
        summarySaving,
        summarySaveError,
        approveNotice,
        dismissApproveNotice,
        savedSummary: summaryCommit,
        savedTitle: titleCommit,
        deleteSummaryReference,
      }}
    >
      {children}
      {approveNotice ? (
        <StepFixModal
          open
          step={approveNotice.step}
          title={approveNotice.title}
          message={approveNotice.message}
          onClose={dismissApproveNotice}
        />
      ) : null}
    </VideoProjectContext.Provider>
  );
}

export function useVideoProject() {
  const ctx = useContext(VideoProjectContext);
  if (!ctx) {
    throw new Error("useVideoProject must be used inside VideoProjectProvider");
  }
  return ctx;
}

export function useProjectDispatch() {
  return useVideoProject().dispatch;
}

export function useOptionalVideoProject() {
  return useContext(VideoProjectContext);
}

export function useApproveStep() {
  const { dispatch } = useVideoProject();
  return useCallback(
    (step: StepId) => {
      dispatch({ type: "SET_STEP_STATUS", step, status: "approved" });
    },
    [dispatch],
  );
}
