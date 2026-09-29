"use client";

import { create } from "zustand";
import type {
  AgentMessage,
  AgentMode,
  AgentThread,
  FlashField,
  MentionId,
} from "@/lib/agent/types";
import { MENTIONS } from "@/lib/agent/types";
import { newId } from "@/lib/videoProject";

export const AGENT_PANEL_MIN = 340;
export const AGENT_PANEL_MAX = 720;
export const AGENT_PANEL_DEFAULT = 420;
const WIDTH_KEY = "acb_agent_panel_width";
const PREFS_KEY = "acb_agent_prefs";
const THREADS_KEY = "acb_agent_threads";

export function clampPanelWidth(value: number): number {
  if (!Number.isFinite(value)) return AGENT_PANEL_DEFAULT;
  return Math.min(AGENT_PANEL_MAX, Math.max(AGENT_PANEL_MIN, Math.round(value)));
}

function emptyThread(): AgentThread {
  const now = new Date().toISOString();
  return {
    id: newId(),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
    checkpoints: [],
    dismissedChips: [],
    mentions: [],
  };
}

function isMention(value: string): value is MentionId {
  return MENTIONS.some((item) => item.id === value);
}

function sanitizeThread(value: unknown): AgentThread | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<AgentThread>;
  if (typeof source.id !== "string") return null;
  const messages = Array.isArray(source.messages)
    ? source.messages.filter(
        (message): message is AgentMessage =>
          !!message &&
          typeof message === "object" &&
          typeof message.id === "string" &&
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string",
      )
    : [];
  const mentions = Array.isArray(source.mentions)
    ? source.mentions.filter((item): item is MentionId => typeof item === "string" && isMention(item))
    : [];
  return {
    id: source.id,
    title: typeof source.title === "string" && source.title.trim() ? source.title : "New chat",
    createdAt: typeof source.createdAt === "string" ? source.createdAt : new Date().toISOString(),
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : new Date().toISOString(),
    messages,
    checkpoints: Array.isArray(source.checkpoints) ? source.checkpoints : [],
    dismissedChips: Array.isArray(source.dismissedChips)
      ? source.dismissedChips.filter((item): item is string => typeof item === "string")
      : [],
    mentions,
  };
}

function loadThreads(videoId: string): AgentThread[] {
  try {
    const raw = localStorage.getItem(`${THREADS_KEY}_${videoId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { version?: number; threads?: unknown };
    if (parsed.version !== 1 || !Array.isArray(parsed.threads)) return [];
    return parsed.threads.map(sanitizeThread).filter((thread): thread is AgentThread => !!thread);
  } catch {
    return [];
  }
}

let runController: AbortController | null = null;

export function takeRunController(): AbortController {
  runController?.abort();
  runController = new AbortController();
  return runController;
}

export function abortAgentRun() {
  runController?.abort();
  runController = null;
}

export function releaseRunController(controller: AbortController) {
  if (runController === controller) runController = null;
}

type StreamRecipe = (message: AgentMessage, text: string) => AgentMessage;

type AgentStore = {
  panelOpen: boolean;
  width: number;
  mode: AgentMode;
  modelId: string;
  autoApply: boolean;
  prefsLoaded: boolean;
  videoId: string | null;
  threads: AgentThread[];
  activeThreadId: string | null;
  streamingStatus: "idle" | "thinking" | "streaming";
  streamingMessageId: string | null;
  streamingText: string;
  mentionOpen: boolean;
  flashes: Partial<Record<FlashField, number>>;
  channelName: string;
  hydratedVideoId: string | null;
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  setWidth: (width: number) => void;
  setMode: (mode: AgentMode) => void;
  setModelId: (id: string) => void;
  setAutoApply: (on: boolean) => void;
  loadPrefs: () => void;
  bindVideo: (videoId: string) => void;
  newThread: () => void;
  selectThread: (id: string) => void;
  setMentionOpen: (open: boolean) => void;
  setChannelName: (name: string) => void;
  dismissChip: (id: string) => void;
  addMention: (id: MentionId) => void;
  removeChip: (id: string) => void;
  pingFlash: (field: FlashField) => void;
  mutateThread: (threadId: string, recipe: (thread: AgentThread) => AgentThread) => void;
  patchMessage: (
    threadId: string,
    messageId: string,
    recipe: (message: AgentMessage) => AgentMessage,
  ) => void;
  beginStream: (messageId: string) => void;
  appendStream: (messageId: string, text: string) => void;
  finishStream: (threadId: string, messageId: string, recipe: StreamRecipe) => void;
};

export const useAgentStore = create<AgentStore>((set, get) => ({
  panelOpen: false,
  width: AGENT_PANEL_DEFAULT,
  mode: "agent",
  modelId: "cursor-cli",
  autoApply: false,
  prefsLoaded: false,
  videoId: null,
  threads: [],
  activeThreadId: null,
  streamingStatus: "idle",
  streamingMessageId: null,
  streamingText: "",
  mentionOpen: false,
  flashes: {},
  channelName: "",
  hydratedVideoId: null,
  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
  setPanelOpen: (open) => set({ panelOpen: open }),
  setWidth: (width) => set({ width: clampPanelWidth(width) }),
  setMode: (mode) => set({ mode }),
  setModelId: (id) => set({ modelId: id }),
  setAutoApply: (on) => set({ autoApply: on }),
  loadPrefs: () => {
    if (get().prefsLoaded || typeof window === "undefined") return;
    let width = AGENT_PANEL_DEFAULT;
    let mode: AgentMode = "agent";
    let modelId = "cursor-cli";
    let autoApply = false;
    try {
      const storedWidth = Number(localStorage.getItem(WIDTH_KEY));
      if (Number.isFinite(storedWidth)) width = clampPanelWidth(storedWidth);
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          mode?: unknown;
          modelId?: unknown;
          autoApply?: unknown;
        };
        if (parsed.mode === "ask" || parsed.mode === "agent") mode = parsed.mode;
        if (typeof parsed.modelId === "string" && parsed.modelId.trim()) {
          modelId =
            parsed.modelId === "mock-fast" || parsed.modelId === "mock-smart"
              ? "cursor-cli"
              : parsed.modelId;
        }
        if (parsed.autoApply === true) autoApply = true;
      }
    } catch {
      /* ignore broken prefs */
    }
    set({ prefsLoaded: true, width, mode, modelId, autoApply });
  },
  bindVideo: (videoId) => {
    if (get().hydratedVideoId === videoId) return;
    const loaded = typeof window === "undefined" ? [] : loadThreads(videoId);
    const threads = loaded.length > 0 ? loaded : [emptyThread()];
    set({
      videoId,
      hydratedVideoId: videoId,
      threads,
      activeThreadId: threads[0]?.id ?? null,
      streamingStatus: "idle",
      streamingMessageId: null,
      streamingText: "",
    });
  },
  newThread: () => {
    abortAgentRun();
    const thread = emptyThread();
    set((state) => ({
      threads: [thread, ...state.threads].slice(0, 30),
      activeThreadId: thread.id,
      streamingStatus: "idle",
      streamingMessageId: null,
      streamingText: "",
      mentionOpen: false,
    }));
  },
  selectThread: (id) => {
    abortAgentRun();
    set({
      activeThreadId: id,
      streamingStatus: "idle",
      streamingMessageId: null,
      streamingText: "",
      mentionOpen: false,
    });
  },
  setMentionOpen: (open) => set({ mentionOpen: open }),
  setChannelName: (name) => set({ channelName: name }),
  dismissChip: (id) => {
    const { activeThreadId } = get();
    if (!activeThreadId) return;
    get().mutateThread(activeThreadId, (thread) =>
      thread.dismissedChips.includes(id)
        ? thread
        : { ...thread, dismissedChips: [...thread.dismissedChips, id] },
    );
  },
  addMention: (id) => {
    const { activeThreadId } = get();
    if (!activeThreadId) return;
    get().mutateThread(activeThreadId, (thread) =>
      thread.mentions.includes(id) ? thread : { ...thread, mentions: [...thread.mentions, id] },
    );
  },
  removeChip: (id) => {
    if (id.startsWith("mention:")) {
      const mention = id.slice("mention:".length);
      if (!isMention(mention)) return;
      const { activeThreadId } = get();
      if (!activeThreadId) return;
      get().mutateThread(activeThreadId, (thread) => ({
        ...thread,
        mentions: thread.mentions.filter((item) => item !== mention),
      }));
      return;
    }
    get().dismissChip(id);
  },
  pingFlash: (field) =>
    set((state) => ({
      flashes: { ...state.flashes, [field]: (state.flashes[field] ?? 0) + 1 },
    })),
  mutateThread: (threadId, recipe) =>
    set((state) => ({
      threads: state.threads.map((thread) => (thread.id === threadId ? recipe(thread) : thread)),
    })),
  patchMessage: (threadId, messageId, recipe) =>
    set((state) => ({
      threads: state.threads.map((thread) => {
        if (thread.id !== threadId) return thread;
        return {
          ...thread,
          updatedAt: new Date().toISOString(),
          messages: thread.messages.map((message) =>
            message.id === messageId ? recipe(message) : message,
          ),
        };
      }),
    })),
  beginStream: (messageId) =>
    set({ streamingStatus: "thinking", streamingMessageId: messageId, streamingText: "" }),
  appendStream: (messageId, text) =>
    set((state) => {
      if (state.streamingMessageId !== messageId) return state;
      return { streamingStatus: "streaming", streamingText: state.streamingText + text };
    }),
  finishStream: (threadId, messageId, recipe) =>
    set((state) => ({
      streamingStatus: state.streamingMessageId === messageId ? "idle" : state.streamingStatus,
      streamingMessageId: state.streamingMessageId === messageId ? null : state.streamingMessageId,
      streamingText: state.streamingMessageId === messageId ? "" : state.streamingText,
      threads: state.threads.map((thread) => {
        if (thread.id !== threadId) return thread;
        return {
          ...thread,
          updatedAt: new Date().toISOString(),
          messages: thread.messages.map((message) =>
            message.id === messageId ? recipe(message, state.streamingText) : message,
          ),
        };
      }),
    })),
}));

if (typeof window !== "undefined") {
  let previous = useAgentStore.getState();
  useAgentStore.subscribe((state) => {
    const before = previous;
    previous = state;
    try {
      if (state.width !== before.width) localStorage.setItem(WIDTH_KEY, String(state.width));
      if (
        state.mode !== before.mode ||
        state.modelId !== before.modelId ||
        state.autoApply !== before.autoApply
      ) {
        localStorage.setItem(
          PREFS_KEY,
          JSON.stringify({ mode: state.mode, modelId: state.modelId, autoApply: state.autoApply }),
        );
      }
      if (state.videoId && state.threads !== before.threads) {
        localStorage.setItem(
          `${THREADS_KEY}_${state.videoId}`,
          JSON.stringify({ version: 1, threads: state.threads.slice(0, 30) }),
        );
      }
    } catch {
      /* storage full or blocked */
    }
  });
}

export function activeThread(state: AgentStore): AgentThread | null {
  return state.threads.find((thread) => thread.id === state.activeThreadId) ?? null;
}

export function threadTitleFrom(text: string): string {
  const line = text.trim().split("\n")[0] ?? "New chat";
  return line.length > 42 ? `${line.slice(0, 41)}…` : line || "New chat";
}
