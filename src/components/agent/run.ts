"use client";

import { acceptAllChanges, acceptChange, recordAgentCost } from "@/components/agent/applyProjectChange";
import { getProjectBridge } from "@/components/agent/bridge";
import {
  abortAgentRun,
  releaseRunController,
  takeRunController,
  threadTitleFrom,
  useAgentStore,
} from "@/components/agent/store";
import type {
  AgentContextPayload,
  AgentMessage,
  ProjectChange,
  RunCost,
  ToolCallState,
} from "@/lib/agent/types";
import { readSse } from "@/lib/agent/sse";
import { newId } from "@/lib/videoProject";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function readContext(): AgentContextPayload {
  const bridge = getProjectBridge();
  const project = bridge?.getProject();
  const step = bridge?.getStep() ?? "summary";
  const channel = useAgentStore.getState().channelName;
  if (!project) {
    return {
      brief: "",
      title: "",
      script: "",
      description: "",
      thumbnail: "",
      timeline: "",
      channel,
      step,
      projectName: "",
      format: "long-form",
      durationSeconds: 300,
      intent: "educational",
      projectId: "",
      selectedTitle: "",
      titleOptions: [],
      thumbnails: [],
      scenes: [],
      references: [],
    };
  }
  const thumbnail =
    project.thumbnails.find((item) => item.id === project.selectedThumbnailId)?.concept ??
    project.thumbnails[0]?.concept ??
    "";
  return {
    brief: project.summary.topic,
    title: project.titles.map((item) => item.text).join("\n"),
    script: project.fullScript,
    description: project.description,
    thumbnail,
    timeline: project.scenes.map((scene) => `${scene.sectionLabel}: ${scene.finalScript}`).join("\n"),
    channel,
    step,
    projectName: project.name,
    format: project.summary.format,
    durationSeconds: project.summary.durationSeconds,
    intent: project.summary.intent,
    projectId: project.id,
    selectedTitle:
      project.titles.find((item) => item.id === project.selectedTitleId)?.text ??
      project.titles[0]?.text ??
      "",
    titleOptions: project.titles.map((item) => ({ id: item.id, text: item.text })),
    thumbnails: project.thumbnails
      .filter((item) => item.concept.trim())
      .map((item) => ({
        id: item.id,
        concept: item.concept,
        ...(item.customUrl?.startsWith("https://") ? { imageUrl: item.customUrl } : {}),
      })),
    scenes: project.scenes.map((scene, index) => ({
      id: scene.id,
      section: scene.sectionLabel,
      script: scene.finalScript,
      durationSeconds: Math.max(1, Math.round(scene.editing.durationSeconds || 1)),
      order: scene.order ?? index,
      existingPrompt: scene.visuals.description ?? "",
    })),
    references: project.summary.references.map((reference) => ({
      url: reference.url.trim(),
      title: reference.title.trim(),
      transcript: reference.transcript,
      hasTranscript: Boolean(reference.transcript.trim()),
    })),
  };
}

function stoppedTools(message: AgentMessage): AgentMessage {
  return {
    ...message,
    toolCalls: (message.toolCalls ?? []).map((tool) =>
      tool.status === "running" ? { ...tool, status: "error", summary: "Stopped" } : tool,
    ),
  };
}

function priorTurns(messages: AgentMessage[]): { role: "user" | "assistant"; content: string }[] {
  let end = messages.length;
  while (end > 0 && messages[end - 1]?.role === "assistant" && !messages[end - 1]?.content.trim()) end -= 1;
  if (end > 0 && messages[end - 1]?.role === "user") end -= 1;
  return messages
    .slice(0, end)
    .filter((message) => message.content.trim())
    .slice(-12)
    .map((message) => ({ role: message.role, content: message.content }));
}

async function streamReply(threadId: string, userText: string, options?: { reset?: boolean }) {
  const store = useAgentStore.getState();
  const assistantId = newId();
  const assistant: AgentMessage = {
    id: assistantId,
    role: "assistant",
    content: "",
    createdAt: new Date().toISOString(),
    toolCalls: [],
    changes: [],
  };
  store.mutateThread(threadId, (thread) => ({
    ...thread,
    updatedAt: new Date().toISOString(),
    messages: [...thread.messages, assistant],
  }));
  store.beginStream(assistantId);

  const controller = takeRunController();
  const mode = "agent" as const;
  const model = store.modelId;
  const context = readContext();
  const thread = useAgentStore.getState().threads.find((item) => item.id === threadId);
  const sdkAgentId = options?.reset ? undefined : thread?.sdkAgentId;
  let costRecorded = false;
  let settled = false;

  const settle = (kind: "done" | "partial" | "error", error?: string) => {
    if (settled) return;
    settled = true;
    releaseRunController(controller);
    useAgentStore.getState().finishStream(threadId, assistantId, (message, text) => {
      const next = stoppedTools({ ...message, content: text || message.content });
      if (kind === "error") return { ...next, error: error ?? "The agent hit a snag. Try again." };
      return next;
    });
    if (kind === "done" && mode === "agent" && useAgentStore.getState().autoApply) {
      acceptAllChanges(threadId, assistantId);
    }
  };

  try {
    const response = await fetch("/api/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        message: userText,
        mode,
        model,
        step: context.step,
        context,
        threadId,
        sdkAgentId,
        reset: options?.reset === true,
        history: sdkAgentId ? [] : priorTurns(thread?.messages ?? []),
        mentions: thread?.mentions ?? [],
        dismissed: thread?.dismissedChips ?? [],
      }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      settle("error", body?.error || "The agent hit a snag. Try again.");
      return;
    }
    await readSse(response, (event, data) => {
      if (controller.signal.aborted) return;
      const record = isRecord(data) ? data : {};
      if (event === "session" && typeof record.sdkAgentId === "string") {
        useAgentStore.getState().mutateThread(threadId, (current) => ({
          ...current,
          sdkAgentId: record.sdkAgentId as string,
        }));
      }
      if (event === "thinking" && typeof record.model === "string" && record.model.trim()) {
        useAgentStore.getState().setModelId(record.model.trim());
      }
      if (event === "token" && typeof record.text === "string") {
        useAgentStore.getState().appendStream(assistantId, record.text);
        return;
      }
      if (event === "tool" && isRecord(record.tool)) {
        const tool = record.tool as ToolCallState;
        if (typeof tool.id !== "string" || typeof tool.name !== "string") return;
        useAgentStore.getState().patchMessage(threadId, assistantId, (message) => {
          const tools = message.toolCalls ?? [];
          const index = tools.findIndex((item) => item.id === tool.id);
          const next = index === -1 ? [...tools, tool] : tools.map((item) => (item.id === tool.id ? tool : item));
          return { ...message, toolCalls: next };
        });
        return;
      }
      if (event === "change" && isRecord(record.change) && mode === "agent") {
        const change = record.change as ProjectChange;
        if (typeof change.id !== "string") return;
        useAgentStore.getState().patchMessage(threadId, assistantId, (message) => ({
          ...message,
          changes: [...(message.changes ?? []), { ...change, status: "pending" }],
        }));
        if (useAgentStore.getState().autoApply) acceptChange(threadId, assistantId, change.id);
        return;
      }
      if (event === "cost" && isRecord(record.cost)) {
        const cost = record.cost as RunCost;
        if (typeof cost.tokens !== "number" || typeof cost.usd !== "number") return;
        useAgentStore.getState().patchMessage(threadId, assistantId, (message) => ({
          ...message,
          cost,
        }));
        if (!costRecorded && mode === "ask") {
          costRecorded = true;
          recordAgentCost(context.step, cost.usd);
          useAgentStore.getState().patchMessage(threadId, assistantId, (message) => ({
            ...message,
            costPosted: true,
          }));
        }
      }
      if (event === "error" && typeof record.message === "string") {
        settle("error", record.message);
      }
    });
    if (!controller.signal.aborted) settle("done");
    else settle("partial");
  } catch (error) {
    const aborted =
      controller.signal.aborted || (error instanceof Error && error.name === "AbortError");
    settle(aborted ? "partial" : "error");
  }
}

export function stopAgent() {
  abortAgentRun();
}

export async function sendAgentMessage(text: string, options?: { truncateFromUserId?: string }) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const state = useAgentStore.getState();
  if (state.streamingStatus !== "idle") return;
  const threadId = state.activeThreadId;
  if (!threadId) return;

  const user: AgentMessage = {
    id: newId(),
    role: "user",
    content: trimmed,
    createdAt: new Date().toISOString(),
  };

  const reset = Boolean(options?.truncateFromUserId);
  state.mutateThread(threadId, (thread) => {
    const index = options?.truncateFromUserId
      ? thread.messages.findIndex((message) => message.id === options.truncateFromUserId)
      : -1;
    const kept = index >= 0 ? thread.messages.slice(0, index) : thread.messages;
    const keptIds = new Set(kept.map((message) => message.id));
    return {
      ...thread,
      title: kept.length === 0 ? threadTitleFrom(trimmed) : thread.title,
      updatedAt: new Date().toISOString(),
      messages: [...kept, user],
      checkpoints: thread.checkpoints.filter((item) => keptIds.has(item.messageId)),
      sdkAgentId: reset ? undefined : thread.sdkAgentId,
    };
  });

  await streamReply(threadId, trimmed, { reset });
}

export async function editAgentMessage(userId: string, text: string) {
  await sendAgentMessage(text, { truncateFromUserId: userId });
}

export async function retryAgentMessage(assistantId: string) {
  const state = useAgentStore.getState();
  if (state.streamingStatus !== "idle") return;
  const threadId = state.activeThreadId;
  const thread = state.threads.find((item) => item.id === threadId);
  if (!threadId || !thread) return;
  const index = thread.messages.findIndex((message) => message.id === assistantId);
  if (index < 0) return;
  const user = [...thread.messages.slice(0, index)].reverse().find((message) => message.role === "user");
  if (!user) return;
  const kept = thread.messages.slice(0, thread.messages.findIndex((message) => message.id === user.id) + 1);
  const keptIds = new Set(kept.map((message) => message.id));
  state.mutateThread(threadId, (current) => ({
    ...current,
    messages: kept,
    checkpoints: current.checkpoints.filter((item) => keptIds.has(item.messageId)),
    updatedAt: new Date().toISOString(),
  }));
  await streamReply(threadId, user.content);
}
