"use client";

import type { SessionEventInput, SessionSnapshot } from "@/lib/session/contract";
import type { PendingSessionEvent } from "@/lib/session/events";

const EVENT_FLUSH_MS = 2_000;
const SNAPSHOT_SYNC_MS = 4_000;
const queues = new Map<string, SessionEventInput[]>();
const eventTimers = new Map<string, number>();
const snapshotTimers = new Map<string, number>();
let sequence = 0;
let lifecycleBound = false;

function id(): string {
  return crypto.randomUUID();
}

function endpoint(sessionId: string, suffix: "events" | "sync"): string {
  return `/api/create/sessions/${encodeURIComponent(sessionId)}/${suffix}`;
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
  if (typeof window === "undefined" || !sessionId) return;
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
  void fetch(endpoint(sessionId, "events"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).then((response) => {
    if (!response.ok) throw new Error(`event sync returned ${response.status}`);
  }).catch((error) => {
    console.error("[video-session] event sync failed", error);
    queues.set(sessionId, [...events, ...(queues.get(sessionId) ?? [])]);
  });
}

export function scheduleSnapshotSync(snapshot: SessionSnapshot): void {
  if (typeof window === "undefined") return;
  const previous = snapshotTimers.get(snapshot.id);
  if (previous) window.clearTimeout(previous);
  snapshotTimers.set(
    snapshot.id,
    window.setTimeout(() => {
      snapshotTimers.delete(snapshot.id);
      void fetch(endpoint(snapshot.id, "sync"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(snapshot),
        keepalive: true,
      }).then((response) => {
        if (!response.ok) throw new Error(`snapshot sync returned ${response.status}`);
      }).catch((error) => {
        console.error("[video-session] snapshot sync failed", error);
      });
    }, SNAPSHOT_SYNC_MS),
  );
}
