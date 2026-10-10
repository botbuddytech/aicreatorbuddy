export type ScheduleJobPhase =
  | "rendering"
  | "review"
  | "approved"
  | "uploading"
  | "processing"
  | "scheduled"
  | "failed";

export type ScheduleJob = {
  sessionId: string;
  title: string;
  publishAtIso: string;
  channelId?: string;
  phase: ScheduleJobPhase;
  /** 0–1 */
  progress: number;
  message: string;
  videoId?: string;
  error?: string;
  updatedAt: string;
};

const STORAGE_KEY = "aicb-schedule-job";
const EVENT = "aicb-schedule-job-change";

let cachedRaw: string | null | undefined;
let cachedSnapshot: ScheduleJob | null = null;

function syncCacheFromStorage(): ScheduleJob | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  if (!raw) {
    cachedSnapshot = null;
    return null;
  }
  try {
    cachedSnapshot = JSON.parse(raw) as ScheduleJob;
    return cachedSnapshot;
  } catch {
    cachedSnapshot = null;
    return null;
  }
}

export function readScheduleJob(): ScheduleJob | null {
  return syncCacheFromStorage();
}

export function writeScheduleJob(job: ScheduleJob | null) {
  if (typeof window === "undefined") return;
  if (!job) {
    sessionStorage.removeItem(STORAGE_KEY);
    cachedRaw = null;
    cachedSnapshot = null;
  } else {
    const raw = JSON.stringify(job);
    sessionStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedSnapshot = job;
  }
  window.dispatchEvent(new Event(EVENT));
}

export function patchScheduleJob(patch: Partial<ScheduleJob>) {
  const current = readScheduleJob();
  if (!current) return;
  writeScheduleJob({ ...current, ...patch, updatedAt: new Date().toISOString() });
}

export function subscribeScheduleJob(listener: () => void): () => void {
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
