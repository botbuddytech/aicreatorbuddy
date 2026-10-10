const STORAGE_KEY = "aicb-schedule-approved-meta";
const EVENT = "aicb-schedule-approved-meta-change";

export type ScheduleApprovedMeta = {
  sessionId: string;
  channelId: string;
  title: string;
  description: string;
  tags: string[];
  publishAtIso: string;
  thumbnailUrl: string | null;
  approvedAt: string;
};

const EMPTY_LIST: ScheduleApprovedMeta[] = [];

let cachedRaw: string | null | undefined;
let cachedMap: Record<string, ScheduleApprovedMeta> = {};
let cachedList: ScheduleApprovedMeta[] = EMPTY_LIST;

function syncListFromMap() {
  const values = Object.values(cachedMap);
  cachedList = values.length === 0 ? EMPTY_LIST : values;
}

function readMap(): Record<string, ScheduleApprovedMeta> {
  if (typeof window === "undefined") return {};
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedMap;
  cachedRaw = raw;
  if (!raw) {
    cachedMap = {};
    syncListFromMap();
    return cachedMap;
  }
  try {
    cachedMap = JSON.parse(raw) as Record<string, ScheduleApprovedMeta>;
  } catch {
    cachedMap = {};
  }
  syncListFromMap();
  return cachedMap;
}

function writeMap(map: Record<string, ScheduleApprovedMeta>) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(map);
  sessionStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedMap = map;
  syncListFromMap();
  window.dispatchEvent(new Event(EVENT));
}

export function saveApprovedMeta(meta: ScheduleApprovedMeta) {
  const map = { ...readMap(), [meta.sessionId]: meta };
  writeMap(map);
}

export function getApprovedMeta(sessionId: string): ScheduleApprovedMeta | null {
  return readMap()[sessionId] ?? null;
}

export function listApprovedMetas(): ScheduleApprovedMeta[] {
  readMap();
  return cachedList;
}

export function clearApprovedMeta(sessionId: string) {
  const map = readMap();
  if (!map[sessionId]) return;
  const next = { ...map };
  delete next[sessionId];
  writeMap(next);
}

export function subscribeApprovedMeta(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, listener);
  };
}

/** Stable reference for useSyncExternalStore until storage changes. */
export function readApprovedMetaSnapshot(): ScheduleApprovedMeta[] {
  readMap();
  return cachedList;
}
