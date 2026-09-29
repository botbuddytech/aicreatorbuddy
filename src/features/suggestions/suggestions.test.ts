import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PredictiveEngine } from "../predictive-text/core/PredictiveEngine";
import { MemoryUserVocabulary } from "../predictive-text/personalization/UserVocabulary";
import { createSuggestHandler } from "../../app/api/suggest/suggestHandler";
import {
  collectSuggestions,
  mergeSuggestions,
  readSuggestionSource,
  sentenceSpan,
} from "./composeSuggestions";
import { createSuggestionProvider } from "./createSuggestionProvider";
import { createLocalProvider } from "./providers/localProvider";
import {
  createGoogleSuggestProvider,
  type SuggestFetch,
  type SuggestFetchResponse,
} from "./providers/googleSuggestProvider";
import type { ComposedSuggestion, SuggestionProvider } from "./types";

const dictionary = [
  { word: "education", frequency: 100 },
  { word: "educational", frequency: 80 },
  { word: "educator", frequency: 40 },
];

function localEngine() {
  return createLocalProvider(
    new PredictiveEngine({
      dictionary,
      userVocabulary: new MemoryUserVocabulary(),
    }),
  );
}

function jsonResponse(body: unknown, status = 200): SuggestFetchResponse {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("suggestion providers", () => {
  it("matches the provider interface and completes a word", async () => {
    const provider: SuggestionProvider = localEngine();
    assert.equal(typeof provider.name, "string");
    assert.equal(typeof provider.getSuggestions, "function");
    const suggestions = await provider.getSuggestions("edu");
    assert.ok(suggestions.includes("education"));
    assert.ok(suggestions.every((item) => !/\s/u.test(item)));
  });

  it("keeps caret replacement on the current word", () => {
    const text = "I am studying edu";
    const items = localEngine().completeAtCaret(text, text.length);
    assert.equal(items[0]?.kind, "word");
    assert.equal(items[0]?.text, "education");
    assert.equal(text.slice(items[0]!.replaceStart, items[0]!.replaceEnd), "edu");
  });

  it("records each accepted word", () => {
    const provider = localEngine();
    provider.acceptWords("machine learning");
    const items = provider.completeAtCaret("lea", 3, 5);
    assert.ok(items.some((item) => item.canonical.toLowerCase() === "learning"));
    assert.equal(items.find((item) => item.canonical.toLowerCase() === "learning")?.source, "personal");
  });
});

describe("composer", () => {
  it("reads the source switch", () => {
    assert.equal(readSuggestionSource(undefined), "hybrid");
    assert.equal(readSuggestionSource("nope"), "local");
    assert.equal(readSuggestionSource("remote"), "remote");
    assert.equal(readSuggestionSource("hybrid"), "hybrid");
    assert.equal(createSuggestionProvider("hybrid").mode, "hybrid");
    assert.equal(createSuggestionProvider("hybrid").remote.name, "google-suggest");
  });

  it("uses only local results in local mode", async () => {
    let calls = 0;
    const remote = fakeRemote(async () => {
      calls += 1;
      return ["should not appear"];
    });
    const updates: ComposedSuggestion[][] = [];
    await collectSuggestions({
      mode: "local",
      text: "edu",
      cursorPosition: 3,
      local: localEngine(),
      remote,
      onUpdate: (items) => updates.push(items),
    });
    assert.equal(calls, 0);
    assert.equal(updates.length, 1);
    assert.ok(updates[0]?.every((item) => item.kind === "word"));
    assert.equal(updates[0]?.[0]?.text, "education");
  });

  it("falls back to local words when remote returns nothing", async () => {
    const updates: ComposedSuggestion[][] = [];
    await collectSuggestions({
      mode: "remote",
      text: "edu",
      cursorPosition: 3,
      local: localEngine(),
      remote: fakeRemote(async () => []),
      onUpdate: (items) => updates.push(items),
    });
    assert.equal(updates.length, 1);
    assert.equal(updates[0]?.[0]?.text, "education");
    assert.equal(updates[0]?.[0]?.kind, "word");
  });

  it("merges hybrid results with local rows first and duplicates removed", async () => {
    const updates: ComposedSuggestion[][] = [];
    await collectSuggestions({
      mode: "hybrid",
      text: "edu",
      cursorPosition: 3,
      local: localEngine(),
      remote: fakeRemote(async () => ["Education", "learn typescript"]),
      onUpdate: (items) => updates.push(items),
    });
    assert.equal(updates.length, 2);
    assert.ok(updates[0]?.every((item) => item.kind === "word"));
    const merged = updates[1] ?? [];
    assert.equal(merged[0]?.text, "education");
    assert.equal(merged[0]?.kind, "word");
    assert.equal(merged.filter((item) => item.text.toLowerCase() === "education").length, 1);
    assert.equal(merged.at(-1)?.text, "learn typescript");
    assert.equal(merged.at(-1)?.kind, "phrase");
  });

  it("caps the merged list", () => {
    const local = localEngine().completeAtCaret("edu", 3, 8);
    const merged = mergeSuggestions(local, ["alpha", "beta", "gamma"], "edu", 2);
    assert.equal(merged.length, 2);
    assert.ok(merged.every((item) => item.kind === "word"));
  });

  it("drops a late remote response after abort", async () => {
    const controller = new AbortController();
    let resolveRemote: (value: string[]) => void = () => {};
    const updates: ComposedSuggestion[][] = [];
    const pending = collectSuggestions({
      mode: "hybrid",
      text: "edu",
      cursorPosition: 3,
      signal: controller.signal,
      local: localEngine(),
      remote: {
        name: "fake",
        getSuggestions: () =>
          new Promise((resolve) => {
            resolveRemote = resolve;
          }),
      },
      onUpdate: (items) => updates.push(items),
    });
    controller.abort();
    resolveRemote(["stale phrase"]);
    await pending;
    assert.equal(updates.length, 1);
    assert.ok(updates[0]?.every((item) => item.kind === "word"));
  });

  it("finds the sentence around the caret", () => {
    const text = "One. Two edu";
    const span = sentenceSpan(text, text.length);
    assert.equal(text.slice(span.start, span.end), "Two edu");
    const whole = sentenceSpan("edu", 3);
    assert.deepEqual(whole, { start: 0, end: 3 });
  });
});

describe("google suggest provider", () => {
  it("calls our proxy, debounces, and caches", async () => {
    const urls: string[] = [];
    let calls = 0;
    const fetchImpl: SuggestFetch = async (url) => {
      calls += 1;
      urls.push(url);
      return jsonResponse({ suggestions: ["education system"] });
    };
    const provider = createGoogleSuggestProvider({ fetchImpl, debounceMs: 40 });
    const pending = provider.getSuggestions("edu");
    await delay(15);
    assert.equal(calls, 0);
    assert.deepEqual(await pending, ["education system"]);
    assert.equal(calls, 1);
    assert.equal(urls[0]?.startsWith("/api/suggest?q=edu"), true);
    assert.equal(urls.some((url) => url.includes("suggestqueries.google.com")), false);
    assert.deepEqual(await provider.getSuggestions("edu"), ["education system"]);
    assert.equal(calls, 1);
  });

  it("cancels a stale query and skips short input", async () => {
    const urls: string[] = [];
    const fetchImpl: SuggestFetch = async (url) => {
      urls.push(url);
      const query = new URL(url, "http://local").searchParams.get("q");
      return jsonResponse({ suggestions: query === "educ" ? ["educational"] : ["education"] });
    };
    const provider = createGoogleSuggestProvider({ fetchImpl, debounceMs: 30 });
    const first = provider.getSuggestions("edu");
    const second = provider.getSuggestions("educ");
    assert.deepEqual(await first, []);
    assert.deepEqual(await second, ["educational"]);
    assert.equal(urls.length, 1);
    assert.deepEqual(await provider.getSuggestions("e"), []);
    assert.equal(urls.length, 1);
  });

  it("resolves an aborted call without fetching", async () => {
    let calls = 0;
    const provider = createGoogleSuggestProvider({
      debounceMs: 50,
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse({ suggestions: ["education"] });
      },
    });
    const controller = new AbortController();
    const pending = provider.getSuggestions("edu", { signal: controller.signal });
    controller.abort();
    assert.deepEqual(await pending, []);
    await delay(70);
    assert.equal(calls, 0);
  });

  it("opens the circuit after a 429 and closes it later", async () => {
    let now = 1_000;
    let calls = 0;
    const provider = createGoogleSuggestProvider({
      debounceMs: 0,
      circuitMs: 60_000,
      now: () => now,
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse({ suggestions: [] }, calls === 1 ? 429 : 200);
      },
    });
    assert.deepEqual(await provider.getSuggestions("edu"), []);
    assert.equal(calls, 1);
    assert.deepEqual(await provider.getSuggestions("education"), []);
    assert.equal(calls, 1);
    now += 60_001;
    await provider.getSuggestions("education");
    assert.equal(calls, 2);
  });

  it("drops the oldest cache entry after 200 keys", async () => {
    const seen = new Set<string>();
    const provider = createGoogleSuggestProvider({
      debounceMs: 0,
      fetchImpl: async (url) => {
        const query = new URL(url, "http://local").searchParams.get("q") ?? "";
        seen.add(query);
        return jsonResponse({ suggestions: [query] });
      },
    });
    for (let index = 0; index < 201; index += 1) {
      await provider.getSuggestions(`k${index}`);
    }
    seen.clear();
    await provider.getSuggestions("k0");
    assert.equal(seen.has("k0"), true);
    seen.clear();
    await provider.getSuggestions("k200");
    assert.equal(seen.has("k200"), false);
  });
});

describe("suggest proxy", () => {
  it("validates, caches, rate-limits, and parses the upstream payload", async () => {
    let now = 5_000;
    let calls = 0;
    const urls: string[] = [];
    const handler = createSuggestHandler({
      now: () => now,
      limitPerMinute: 2,
      fetchImpl: async (url) => {
        calls += 1;
        urls.push(url);
        const query = new URL(url).searchParams.get("q") ?? "";
        return jsonResponse([query, [`${query} one`, `${query} two`]]);
      },
    });

    assert.deepEqual((await handler.handle("  ", "1.1.1.1")).body.suggestions, []);
    assert.equal((await handler.handle("x".repeat(101), "1.1.1.1")).status, 200);
    assert.equal(calls, 0);

    const first = await handler.handle("edu", "1.1.1.1");
    assert.deepEqual(first.body.suggestions, ["edu one", "edu two"]);
    assert.equal(urls[0]?.startsWith("https://suggestqueries.google.com/complete/search?"), true);
    assert.equal(new URL(urls[0] ?? "").searchParams.get("client"), "firefox");
    assert.equal(new URL(urls[0] ?? "").searchParams.get("q"), "edu");
    await handler.handle("edu", "1.1.1.1");
    assert.equal(calls, 1);

    assert.equal((await handler.handle("ed", "1.1.1.1")).status, 200);
    assert.equal((await handler.handle("educ", "1.1.1.1")).status, 429);
    now += 60_001;
    assert.equal((await handler.handle("educ", "1.1.1.1")).status, 200);
  });

  it("returns an empty list when the upstream call fails or times out", async () => {
    const failed = createSuggestHandler({
      fetchImpl: async () => jsonResponse({ error: true }, 500),
    });
    const failure = await failed.handle("edu", "2.2.2.2");
    assert.equal(failure.status, 200);
    assert.deepEqual(failure.body.suggestions, []);

    const timedOut = createSuggestHandler({
      timeoutMs: 20,
      fetchImpl: (_url, init) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) {
            reject(new Error("missing signal"));
            return;
          }
          signal.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    });
    const timeout = await timedOut.handle("edu", "3.3.3.3");
    assert.equal(timeout.status, 200);
    assert.deepEqual(timeout.body.suggestions, []);
  });
});

function fakeRemote(getSuggestions: SuggestionProvider["getSuggestions"]): SuggestionProvider {
  return { name: "fake", getSuggestions };
}
