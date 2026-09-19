"use client";

import type { SessionEventInput, SessionSnapshot } from "@/lib/session/contract";
import type { PendingSessionEvent } from "@/lib/session/events";

const EVENT_FLUSH_MS = 2_000;
const SNAPSHOT_SYNC_MS = 4_000;
const queues = new Map<string, SessionEventInput[]>();
const eventTimers = new Map<string, number>();
const snapshotTimers = new Map<string, number>();
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
    if (response.status === 410) deletedSessions.add(sessionId);
    if (!response.ok) throw new Error(`event sync returned ${response.status}`);
  }).catch((error) => {
    if (controller.signal.aborted || deletedSessions.has(sessionId)) return;
    console.error("[video-session] event sync failed", error);
    queues.set(sessionId, [...events, ...(queues.get(sessionId) ?? [])]);
  }).finally(() => {
    releaseController(sessionId, controller);
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
      const controller = controllerFor(snapshot.id);
      void fetch(endpoint(snapshot.id, "sync"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(snapshot),
        keepalive: true,
        signal: controller.signal,
      }).then((response) => {
        if (response.status === 410) deletedSessions.add(snapshot.id);
        if (!response.ok) throw new Error(`snapshot sync returned ${response.status}`);
      }).catch((error) => {
        if (controller.signal.aborted || deletedSessions.has(snapshot.id)) return;
        console.error("[video-session] snapshot sync failed", error);
      }).finally(() => {
        releaseController(snapshot.id, controller);
      });
    }, SNAPSHOT_SYNC_MS),
  );
}
