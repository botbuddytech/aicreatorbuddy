"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { useVideoProjectDraft } from "@/lib/useVideoProjectDraft";
import {
  applySummaryPatch,
  cloneScene,
  createEmptyScene,
  emptyEditorSettings,
  inferStepStatus,
  reindexScenes,
  sceneDuration,
  type AiProvider,
  type ApiCostEntry,
  type EditorSettings,
  type LowEffortReport,
  type Scene,
  type StepId,
  type StepStatus,
  type ThumbnailOption,
  type TitleOption,
  type VideoProject,
  type VidIqScriptInsight,
  type VidIqThumbInsight,
  type VidIqTitleInsight,
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
  | { type: "SET_TITLES"; titles: TitleOption[] }
  | { type: "SELECT_TITLE"; id: string }
  | { type: "EDIT_TITLE"; id: string; text: string }
  | { type: "REPLACE_TITLE"; id: string; title: TitleOption }
  | { type: "SET_THUMBNAILS"; thumbnails: ThumbnailOption[] }
  | { type: "SELECT_THUMBNAIL"; id: string }
  | { type: "ADD_THUMBNAIL"; thumbnail: ThumbnailOption }
  | { type: "REPLACE_THUMBNAIL"; id: string; thumbnail: ThumbnailOption }
  | { type: "SET_TITLE_INSIGHTS"; insights: Record<string, VidIqTitleInsight> }
  | { type: "SET_THUMBNAIL_INSIGHTS"; insights: Record<string, VidIqThumbInsight> }
  | { type: "SET_SCRIPT_INSIGHT"; insight: VidIqScriptInsight }
  | { type: "SET_SCRIPT"; script: string }
  | { type: "SET_SCENES"; scenes: Scene[] }
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
  | { type: "SET_LOW_EFFORT_REPORT"; report: LowEffortReport };

function applyScenePatch(scene: Scene, patch: ScenePatch): Scene {
  return {
    ...scene,
    ...patch,
    voiceover: { ...scene.voiceover, ...patch.voiceover },
    visuals: { ...scene.visuals, ...patch.visuals },
    editing: { ...scene.editing, ...patch.editing },
  };
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
      return { ...state, titles: action.titles, selectedTitleId: null };
    case "SELECT_TITLE":
      return { ...state, selectedTitleId: action.id };
    case "EDIT_TITLE":
      return {
        ...state,
        titles: state.titles.map((title) =>
          title.id === action.id ? { ...title, text: action.text, vidiq: undefined } : title,
        ),
      };
    case "REPLACE_TITLE":
      return {
        ...state,
        titles: state.titles.map((title) => (title.id === action.id ? action.title : title)),
      };
    case "SET_THUMBNAILS":
      return { ...state, thumbnails: action.thumbnails, selectedThumbnailId: null };
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
    case "SET_TITLE_INSIGHTS":
      return {
        ...state,
        titles: state.titles.map((title) => {
          const insight = action.insights[title.id];
          return insight ? { ...title, vidiq: insight } : title;
        }),
      };
    case "SET_THUMBNAIL_INSIGHTS":
      return {
        ...state,
        thumbnails: state.thumbnails.map((thumb) => {
          const insight = action.insights[thumb.id];
          return insight ? { ...thumb, vidiq: insight } : thumb;
        }),
      };
    case "SET_SCRIPT_INSIGHT":
      return { ...state, scriptVidiq: action.insight };
    case "SET_SCRIPT":
      return { ...state, fullScript: action.script };
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
};

const VideoProjectContext = createContext<ProjectContextValue | null>(null);

export function VideoProjectProvider({
  projectId,
  children,
  fallback,
  missing,
}: {
  projectId: string;
  children: ReactNode;
  fallback: ReactNode;
  missing: ReactNode;
}) {
  const { hydrated, initial, persist, savedAt } = useVideoProjectDraft(projectId);
  const [project, dispatch] = useReducer(reducer, null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<StepId>("summary");

  if (hydrated && loadedId !== projectId) {
    setLoadedId(projectId);
    setPreviewOpen(false);
    setActiveStep("summary");
    dispatch({ type: "HYDRATE", project: initial });
  }

  useEffect(() => {
    if (!project || loadedId !== projectId) return;
    persist(project);
  }, [project, persist, loadedId, projectId]);

  const value = useMemo(
    () =>
      project
        ? { project, savedAt, dispatch, previewOpen, setPreviewOpen, activeStep, setActiveStep }
        : null,
    [project, savedAt, previewOpen, activeStep],
  );

  if (!hydrated) return <>{fallback}</>;
  if (!value) return <>{missing}</>;
  return <VideoProjectContext.Provider value={value}>{children}</VideoProjectContext.Provider>;
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
