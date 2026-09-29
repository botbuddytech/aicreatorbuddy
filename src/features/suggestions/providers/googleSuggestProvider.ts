import type { SuggestionProvider } from "../types";

const DEFAULT_DEBOUNCE_MS = 250;
const DEFAULT_TIMEOUT_MS = 2000;
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_CIRCUIT_MS = 60 * 1000;
const CACHE_LIMIT = 200;
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 8;

export type SuggestFetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

export type SuggestFetch = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<SuggestFetchResponse>;

export type GoogleSuggestOptions = {
  fetchImpl?: SuggestFetch;
  debounceMs?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  circuitMs?: number;
  now?: () => number;
  endpoint?: string;
};

type CacheEntry = {
  at: number;
  value: string[];
};

export function createGoogleSuggestProvider(options: GoogleSuggestOptions = {}): SuggestionProvider {
  const fetchImpl = options.fetchImpl ?? defaultFetch;
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const circuitMs = options.circuitMs ?? DEFAULT_CIRCUIT_MS;
  const now = options.now ?? (() => Date.now());
  const endpoint = options.endpoint ?? "/api/suggest";
  const cache = new Map<string, CacheEntry>();
  let circuitUntil = 0;
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inflight: AbortController | null = null;
  let waiters: Array<(value: string[]) => void> = [];

  function settle(value: string[]) {
    const pending = waiters;
    waiters = [];
    for (const resolve of pending) resolve(value);
  }

  function clearTimer() {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
  }

  function abortInflight() {
    inflight?.abort();
    inflight = null;
  }

  function cancelPending() {
    clearTimer();
    abortInflight();
    generation += 1;
    settle([]);
  }

  function readCache(key: string): string[] | undefined {
    const entry = cache.get(key);
    if (!entry) return undefined;
    if (now() - entry.at > cacheTtlMs) {
      cache.delete(key);
      return undefined;
    }
    cache.delete(key);
    cache.set(key, entry);
    return entry.value;
  }

  function writeCache(key: string, value: string[]) {
    if (cache.has(key)) cache.delete(key);
    cache.set(key, { at: now(), value });
    while (cache.size > CACHE_LIMIT) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
  }

  async function fetchSuggestions(query: string, key: string, limit: number, requestGeneration: number, signal?: AbortSignal) {
    const controller = new AbortController();
    inflight = controller;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort);
    try {
      const response = await fetchImpl(`${endpoint}?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      });
      if (requestGeneration !== generation) return [];
      if (response.status === 429) {
        circuitUntil = now() + circuitMs;
        return [];
      }
      if (!response.ok) return [];
      const suggestions = readSuggestionList(await response.json()).slice(0, limit);
      if (suggestions.length > 0) writeCache(key, suggestions);
      return suggestions;
    } catch {
      return [];
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      if (inflight === controller) inflight = null;
    }
  }

  return {
    name: "google-suggest",
    getSuggestions(input, opts) {
      const query = input.trim();
      const limit = Math.min(Math.max(opts?.limit ?? MAX_RESULTS, 0), MAX_RESULTS);
      if (opts?.signal?.aborted || query.length < MIN_QUERY_LENGTH || limit === 0) return Promise.resolve([]);
      if (now() < circuitUntil) return Promise.resolve([]);

      const key = query.toLowerCase();
      const cached = readCache(key);
      if (cached) {
        cancelPending();
        return Promise.resolve(cached.slice(0, limit));
      }

      cancelPending();
      const requestGeneration = generation;

      return new Promise((resolve) => {
        waiters.push(resolve);
        const signal = opts?.signal;
        const onAbort = () => {
          if (requestGeneration !== generation) return;
          clearTimer();
          abortInflight();
          generation += 1;
          settle([]);
        };
        if (signal?.aborted) {
          onAbort();
          return;
        }
        signal?.addEventListener("abort", onAbort, { once: true });
        timer = setTimeout(() => {
          timer = null;
          void fetchSuggestions(query, key, limit, requestGeneration, signal).then((value) => {
            if (requestGeneration !== generation) return;
            settle(value);
          });
        }, debounceMs);
      });
    },
  };
}

function readSuggestionList(body: unknown): string[] {
  if (!isRecord(body)) return [];
  const suggestions = body.suggestions;
  if (!Array.isArray(suggestions)) return [];
  return suggestions.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function defaultFetch(url: string, init?: { signal?: AbortSignal }): Promise<SuggestFetchResponse> {
  return fetch(url, { signal: init?.signal });
}
