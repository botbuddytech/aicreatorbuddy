"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  createEmptyProject,
  normalizeApiCosts,
  normalizeEditorSettings,
  normalizeLowEffortByStep,
  normalizeScenes,
  normalizeStepStatus,
  normalizeSummary,
  newId,
  type VideoProject,
} from "@/lib/videoProject";

export const VIDEO_PROJECTS_KEY = "yb_video_projects";
const STORE_VERSION = 1;
const SAVE_DEBOUNCE_MS = 600;
const STORE_EVENT = "yb-video-projects";

type ProjectStore = {
  version: number;
  projects: VideoProject[];
};

function emptyStore(): ProjectStore {
  return { version: STORE_VERSION, projects: [] };
}

function parseStore(raw: string): ProjectStore {
  if (!raw) return emptyStore();
  try {
    const parsed = JSON.parse(raw) as ProjectStore;
    if (!parsed || !Array.isArray(parsed.projects)) return emptyStore();
    return {
      version: STORE_VERSION,
      projects: parsed.projects.map((project) => ({
        ...project,
        summary: normalizeSummary(project.summary),
        apiCosts: normalizeApiCosts(project.apiCosts),
        scenes: normalizeScenes(project.scenes),
        editor: normalizeEditorSettings(project.editor),
        lowEffortByStep: normalizeLowEffortByStep(project.lowEffortByStep),
        stepStatus: normalizeStepStatus(project.stepStatus),
        renderedAt: typeof project.renderedAt === "string" ? project.renderedAt : null,
      })),
    };
  } catch {
    return emptyStore();
  }
}

export function readProjectStore(): ProjectStore {
  if (typeof window === "undefined") return emptyStore();
  return parseStore(window.localStorage.getItem(VIDEO_PROJECTS_KEY) ?? "");
}

function emitStoreChange() {
  window.dispatchEvent(new Event(STORE_EVENT));
}

export function writeProjectStore(store: ProjectStore) {
  window.localStorage.setItem(VIDEO_PROJECTS_KEY, JSON.stringify(store));
  emitStoreChange();
}

export function upsertProjectInStore(project: VideoProject) {
  const store = readProjectStore();
  const index = store.projects.findIndex((item) => item.id === project.id);
  const projects =
    index >= 0
      ? store.projects.map((item) => (item.id === project.id ? project : item))
      : [project, ...store.projects];
  writeProjectStore({ version: STORE_VERSION, projects });
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(STORE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(STORE_EVENT, onChange);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(VIDEO_PROJECTS_KEY) ?? "";
}

function getServerSnapshot() {
  return "";
}

function subscribeClient() {
  return () => {};
}

export function useProjectStore() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(subscribeClient, () => true, () => false);
  const projects = useMemo(() => parseStore(raw).projects, [raw]);

  const createProject = useCallback((channelId: string) => {
    const project = createEmptyProject({ channelId });
    const current = readProjectStore().projects.filter((item) => item.id !== project.id);
    writeProjectStore({ version: STORE_VERSION, projects: [project, ...current] });
    return project;
  }, []);

  const duplicateProject = useCallback((id: string) => {
    const source = readProjectStore().projects.find((item) => item.id === id);
    if (!source) return null;
    const now = new Date().toISOString();
    const copy: VideoProject = {
      ...(JSON.parse(JSON.stringify(source)) as VideoProject),
      id: newId(),
      name: `${source.name} (copy)`,
      apiCosts: [],
      createdAt: now,
      lastUpdated: now,
    };
    writeProjectStore({
      version: STORE_VERSION,
      projects: [copy, ...readProjectStore().projects],
    });
    return copy;
  }, []);

  const deleteProject = useCallback((id: string) => {
    writeProjectStore({
      version: STORE_VERSION,
      projects: readProjectStore().projects.filter((item) => item.id !== id),
    });
  }, []);

  return { hydrated, projects, createProject, duplicateProject, deleteProject };
}

export function useVideoProjectDraft(projectId: string) {
  const hydrated = useSyncExternalStore(subscribeClient, () => true, () => false);
  const initial = useMemo(() => {
    if (!hydrated) return null;
    return readProjectStore().projects.find((item) => item.id === projectId) ?? null;
  }, [hydrated, projectId]);

  const [savedAt, setSavedAt] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const pendingRef = useRef<VideoProject | null>(null);

  const persist = useCallback((next: VideoProject) => {
    pendingRef.current = next;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const pending = pendingRef.current;
      if (!pending) return;
      upsertProjectInStore(pending);
      setSavedAt(pending.lastUpdated);
      pendingRef.current = null;
    }, SAVE_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (pendingRef.current) upsertProjectInStore(pendingRef.current);
    };
  }, []);

  return {
    hydrated,
    initial,
    persist,
    savedAt: savedAt ?? initial?.lastUpdated ?? null,
  };
}
