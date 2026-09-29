const UPSTREAM = "https://suggestqueries.google.com/complete/search";
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_LIMIT_PER_MINUTE = 30;
const WINDOW_MS = 60 * 1000;
const MAX_QUERY_LENGTH = 100;
const DEFAULT_TIMEOUT_MS = 2000;

export type SuggestBody = {
  suggestions: string[];
};

export type SuggestResult = {
  status: number;
  body: SuggestBody;
};

type UpstreamResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

export type SuggestHandlerOptions = {
  fetchImpl?: (url: string, init?: { signal?: AbortSignal }) => Promise<UpstreamResponse>;
  now?: () => number;
  cacheTtlMs?: number;
  limitPerMinute?: number;
  timeoutMs?: number;
};

type CacheEntry = {
  at: number;
  value: string[];
};

export function createSuggestHandler(options: SuggestHandlerOptions = {}) {
  const fetchImpl = options.fetchImpl ?? defaultFetch;
  const now = options.now ?? (() => Date.now());
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const limitPerMinute = options.limitPerMinute ?? DEFAULT_LIMIT_PER_MINUTE;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const cache = new Map<string, CacheEntry>();
  const hits = new Map<string, number[]>();

  return {
    async handle(q: string | null, ip: string): Promise<SuggestResult> {
      const query = (q ?? "").trim();
      if (!query || query.length > MAX_QUERY_LENGTH) return empty(200);

      const key = query.toLowerCase();
      const cached = readCache(cache, key, now(), cacheTtlMs);
      if (cached) return { status: 200, body: { suggestions: cached } };

      if (!allow(hits, ip || "unknown", now(), limitPerMinute)) return empty(429);

      try {
        const url = new URL(UPSTREAM);
        url.searchParams.set("client", "firefox");
        url.searchParams.set("ie", "utf8");
        url.searchParams.set("oe", "utf8");
        url.searchParams.set("q", query);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetchImpl(url.toString(), { signal: controller.signal });
          if (!response.ok) return empty(200);
          const suggestions = readUpstream(await response.json());
          cache.set(key, { at: now(), value: suggestions });
          return { status: 200, body: { suggestions } };
        } finally {
          clearTimeout(timer);
        }
      } catch {
        return empty(200);
      }
    },
  };
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}

function allow(hits: Map<string, number[]>, ip: string, now: number, limit: number): boolean {
  const recent = (hits.get(ip) ?? []).filter((stamp) => now - stamp < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

function readCache(cache: Map<string, CacheEntry>, key: string, now: number, ttl: number): string[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (now - entry.at > ttl) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function readUpstream(body: unknown): string[] {
  if (!Array.isArray(body) || !Array.isArray(body[1])) return [];
  return body[1].filter((item): item is string => typeof item === "string");
}

function empty(status: number): SuggestResult {
  return { status, body: { suggestions: [] } };
}

async function defaultFetch(url: string, init?: { signal?: AbortSignal }): Promise<UpstreamResponse> {
  return fetch(url, { signal: init?.signal });
}
