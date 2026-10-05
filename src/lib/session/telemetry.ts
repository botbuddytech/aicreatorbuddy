"use client";

import type { SessionEventInput, SessionSnapshot } from "@/lib/session/contract";
import type { PendingSessionEvent } from "@/lib/session/events";

const EVENT_FLUSH_MS = 2_000;
const SNAPSHOT_SYNC_MS = 4_000;
const queues = new Map<string, SessionEventInput[]>();
const eventTimers = new Map<string, number>();
const snapshotTimers = new Map<string, number>();
const snapshotRequests = new Map<string, AbortController>();
const inFlight = new Map<string, Set<AbortController>>();
const deletedSessions = new Set<string>();
let sequence = 0;
let lifecycleBound = false;

function id(): string {
  return crypto.randomUUID();
}

function endpoint(sessionId: string, suffix: "events" | "sync"): string {
  return `/api/create/sessions/${encodeURIComponent(sessionId)}/${suffix}`;
}

function controllerFor(sessionId: string): AbortController {
  const controller = new AbortController();
  const controllers = inFlight.get(sessionId) ?? new Set<AbortController>();
  controllers.add(controller);
  inFlight.set(sessionId, controllers);
  return controller;
}

function releaseController(sessionId: string, controller: AbortController) {
  const controllers = inFlight.get(sessionId);
  controllers?.delete(controller);
  if (!controllers?.size) inFlight.delete(sessionId);
}

export function cancelSessionTelemetry(sessionId: string): void {
  deletedSessions.add(sessionId);
  queues.delete(sessionId);
  const eventTimer = eventTimers.get(sessionId);
  if (eventTimer) window.clearTimeout(eventTimer);
  eventTimers.delete(sessionId);
  const snapshotTimer = snapshotTimers.get(sessionId);
  if (snapshotTimer) window.clearTimeout(snapshotTimer);
  snapshotTimers.delete(sessionId);
  snapshotRequests.get(sessionId)?.abort();
  snapshotRequests.delete(sessionId);
  for (const controller of inFlight.get(sessionId) ?? []) controller.abort();
  inFlight.delete(sessionId);
}

export function resumeSessionTelemetry(sessionId: string): void {
  deletedSessions.delete(sessionId);
}

function bindLifecycle() {
  if (lifecycleBound || typeof window === "undefined") return;
  lifecycleBound = true;
  const flush = () => {
    for (const sessionId of queues.keys()) flushSessionEvents(sessionId, true);
  };
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

export function trackSessionEvent(sessionId: string, input: PendingSessionEvent): void {
  if (typeof window === "undefined" || !sessionId || deletedSessions.has(sessionId)) return;
  bindLifecycle();
  const item: SessionEventInput = {
    clientEventId: id(),
    type: input.type,
    step: input.step ?? null,
    at: new Date().toISOString(),
    sequence: ++sequence,
    payload: input.payload ?? {},
  };
  queues.set(sessionId, [...(queues.get(sessionId) ?? []), item]);
  if (input.type === "api.call") {
    flushSessionEvents(sessionId);
    return;
  }
  const previous = eventTimers.get(sessionId);
  if (previous) window.clearTimeout(previous);
  eventTimers.set(
    sessionId,
    window.setTimeout(() => flushSessionEvents(sessionId), EVENT_FLUSH_MS),
  );
}

export function flushSessionEvents(sessionId: string, beacon = false): void {
  if (deletedSessions.has(sessionId)) {
    queues.delete(sessionId);
    return;
  }
  const events = queues.get(sessionId);
  if (!events?.length) return;
  queues.delete(sessionId);
  const timer = eventTimers.get(sessionId);
  if (timer) window.clearTimeout(timer);
  eventTimers.delete(sessionId);
  const body = JSON.stringify({ events });
  if (beacon && navigator.sendBeacon(endpoint(sessionId, "events"), new Blob([body], {
    type: "text/plain;charset=UTF-8",
  }))) {
    return;
  }
  const controller = controllerFor(sessionId);
  void fetch(endpoint(sessionId, "events"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
    signal: controller.signal,
  }).then((response) => {
    // 410 = permanently deleted; 404 = missing or owned by another account.
    if (response.status === 410 || response.status === 404) {
      deletedSessions.add(sessionId);
      return;
    }
    if (!response.ok) throw new Error(`event sync returned ${response.status}`);
  }).catch((error) => {
    if (controller.signal.aborted || deletedSessions.has(sessionId)) return;
    console.error("[video-session] event sync failed", error);
    queues.set(sessionId, [...events, ...(queues.get(sessionId) ?? [])]);
  }).finally(() => {
    releaseController(sessionId, controller);
  });
}

export type SnapshotSyncResult = "ok" | "aborted" | "busy" | "failed";

function sendSnapshot(
  snapshot: SessionSnapshot,
  preempt: boolean,
): Promise<SnapshotSyncResult> {
  if (deletedSessions.has(snapshot.id)) return Promise.resolve("failed");
  const current = snapshotRequests.get(snapshot.id);
  if (current && !preempt) return Promise.resolve("busy");
  current?.abort();
  const controller = new AbortController();
  snapshotRequests.set(snapshot.id, controller);
  return fetch(endpoint(snapshot.id, "sync"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(snapshot),
    keepalive: true,
    signal: controller.signal,
  }).then((response) => {
    if (snapshotRequests.get(snapshot.id) === controller) snapshotRequests.delete(snapshot.id);
    if (response.status === 410 || response.status === 404) {
      deletedSessions.add(snapshot.id);
      return "failed";
    }
    if (!response.ok) throw new Error(`snapshot sync returned ${response.status}`);
    return "ok" as const;
  }).catch((error: unknown) => {
    if (snapshotRequests.get(snapshot.id) === controller) snapshotRequests.delete(snapshot.id);
    if (controller.signal.aborted || deletedSessions.has(snapshot.id)) return "aborted";
    console.error("[video-session] snapshot sync failed", error);
    return "failed";
  });
}

export function scheduleSnapshotSync(snapshot: SessionSnapshot): void {
  if (typeof window === "undefined" || deletedSessions.has(snapshot.id)) return;
  const previous = snapshotTimers.get(snapshot.id);
  if (previous) window.clearTimeout(previous);
  snapshotTimers.set(
    snapshot.id,
    window.setTimeout(() => {
      snapshotTimers.delete(snapshot.id);
      if (deletedSessions.has(snapshot.id)) return;
      void sendSnapshot(snapshot, false).then((result) => {
        if (result === "busy") scheduleSnapshotSync(snapshot);
      });
    }, SNAPSHOT_SYNC_MS),
  );
}

export function flushSnapshotSync(snapshot: SessionSnapshot): Promise<SnapshotSyncResult> {
  if (typeof window === "undefined" || deletedSessions.has(snapshot.id)) {
    return Promise.resolve("failed");
  }
  const pending = snapshotTimers.get(snapshot.id);
  if (pending) window.clearTimeout(pending);
  snapshotTimers.delete(snapshot.id);
  return sendSnapshot(snapshot, true);
}
