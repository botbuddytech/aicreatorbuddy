import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { applyTypingCase } from "./core/capitalize";
import { PredictiveEngine } from "./core/PredictiveEngine";
import { tokenAtCursor } from "./core/tokenize";
import dictionary from "./data/dictionary.json";
import phrases from "./data/phrases.json";
import { LocalDictionaryProvider } from "./dictionary/LocalDictionaryProvider";
import { applySuggestion } from "./integration/applySuggestion";
import { moveActiveIndex, suggestionKeyAction } from "./integration/suggestionKeys";
import {
  LocalStorageUserVocabulary,
  MemoryUserVocabulary,
} from "./personalization/UserVocabulary";
import { Trie } from "./trie/Trie";
import type { DictionaryEntry, PhraseEntry } from "./types";

const root = fileURLToPath(new URL(".", import.meta.url));

const educationDictionary: DictionaryEntry[] = [
  { word: "education", frequency: 92342 },
  { word: "educational", frequency: 48210 },
  { word: "educator", frequency: 17320 },
  { word: "educate", frequency: 12000 },
  { word: "educating", frequency: 9000 },
  { word: "developer", frequency: 82310 },
  { word: "development", frequency: 79000 },
  { word: "develop", frequency: 41000 },
  { word: "device", frequency: 28000 },
  { word: "developing", frequency: 24000 },
  { word: "support", frequency: 88000 },
  { word: "super", frequency: 45000 },
  { word: "Supabase", frequency: 26000 },
  { word: "suppose", frequency: 21000 },
  { word: "supportive", frequency: 8000 },
];

function engine() {
  return new PredictiveEngine({ dictionary: educationDictionary });
}

function texts(result: { suggestions: { text: string }[] }) {
  return result.suggestions.map((suggestion) => suggestion.text);
}

describe("Trie", () => {
  it("returns prefix matches without scanning unrelated words", () => {
    const trie = new Trie();
    for (const word of ["education", "educational", "educator", "educate", "educating", "device"]) {
      trie.insert(word, 1);
    }
    const matches = trie.search("edu").sort();
    assert.deepEqual(matches, ["educate", "educating", "education", "educational", "educator"]);
    assert.equal(trie.has("Education"), true);
    assert.equal(trie.has("device"), true);
    assert.equal(trie.getSuggestions("edu", 2).length, 2);
    assert.equal(trie.search("zzzz").length, 0);
  });

  it("removes a word and keeps siblings", () => {
    const trie = new Trie();
    trie.insert("education", 10);
    trie.insert("educational", 5);
    assert.equal(trie.remove("education"), true);
    assert.equal(trie.has("education"), false);
    assert.equal(trie.has("educational"), true);
    assert.equal(trie.remove("missing"), false);
  });
});

describe("PredictiveEngine", () => {
  it("ranks edu by frequency rather than alphabetically", () => {
    const result = engine().getSuggestions({ text: "edu", cursorPosition: 3 });
    assert.deepEqual(texts(result), [
      "education",
      "educational",
      "educator",
      "educate",
      "educating",
    ]);
    assert.notDeepEqual(texts(result), [...texts(result)].sort());
    assert.ok(result.suggestions.every((suggestion, index, list) => index === 0 || suggestion.score <= list[index - 1].score));
    assert.ok(result.suggestions.every((suggestion) => suggestion.source === "dictionary"));
  });

  it("suggests developer words for dev", () => {
    const result = engine().getSuggestions({ text: "dev", cursorPosition: 3 });
    assert.deepEqual(texts(result), [
      "developer",
      "development",
      "develop",
      "device",
      "developing",
    ]);
  });

  it("keeps Supabase casing for sup", () => {
    const result = engine().getSuggestions({ text: "sup", cursorPosition: 3 });
    assert.deepEqual(texts(result), ["support", "super", "Supabase", "suppose", "supportive"]);
  });

  it("reads the token in a sentence and in the middle of the text", () => {
    const predictor = engine();
    const sentence = "I am studying edu";
    const end = predictor.getSuggestions({ text: sentence, cursorPosition: sentence.length });
    assert.equal(end.currentWord, "edu");
    assert.equal(end.suggestions[0].text, "education");
    const education = end.suggestions[0];
    const applied = applySuggestion(sentence, education.replaceStart, education.replaceEnd, education.text);
    assert.equal(applied.text, "I am studying education");
    assert.equal(applied.cursor, applied.text.length);

    const middle = "I am edu studying";
    const cursor = middle.indexOf("edu") + 3;
    const inside = predictor.getSuggestions({ text: middle, cursorPosition: cursor });
    assert.equal(inside.currentWord, "edu");
    assert.equal(inside.tokenRange.start, middle.indexOf("edu"));
    assert.equal(inside.suggestions[0].text, "education");
    const replaced = applySuggestion(
      middle,
      inside.suggestions[0].replaceStart,
      inside.suggestions[0].replaceEnd,
      inside.suggestions[0].text,
    );
    assert.equal(replaced.text, "I am education studying");
  });

  it("preserves punctuation around the current token", () => {
    const predictor = engine();
    const text = "edu,";
    const result = predictor.getSuggestions({ text, cursorPosition: text.length });
    assert.equal(result.currentWord, "edu");
    const education = result.suggestions[0];
    const applied = applySuggestion(text, education.replaceStart, education.replaceEnd, education.text);
    assert.equal(applied.text, "education,");

    const wrapped = "(Edu)";
    const cased = predictor.getSuggestions({ text: wrapped, cursorPosition: wrapped.length });
    assert.equal(cased.currentWord, "Edu");
    const next = applySuggestion(
      wrapped,
      cased.suggestions[0].replaceStart,
      cased.suggestions[0].replaceEnd,
      cased.suggestions[0].text,
    );
    assert.equal(next.text, "(Education)");

    const hyphen = "edu-";
    const hyphenated = predictor.getSuggestions({ text: hyphen, cursorPosition: hyphen.length });
    assert.equal(hyphenated.currentWord, "edu");
    const kept = applySuggestion(
      hyphen,
      hyphenated.suggestions[0].replaceStart,
      hyphenated.suggestions[0].replaceEnd,
      hyphenated.suggestions[0].text,
    );
    assert.equal(kept.text, "education-");
  });

  it("mirrors capitalization and keeps canonical proper nouns", () => {
    const predictor = engine();
    assert.equal(
      predictor.getSuggestions({ text: "Edu", cursorPosition: 3 }).suggestions[0].text,
      "Education",
    );
    assert.equal(
      predictor.getSuggestions({ text: "EDU", cursorPosition: 3 }).suggestions[0].text,
      "EDUCATION",
    );
    assert.equal(
      predictor.getSuggestions({ text: "sup", cursorPosition: 3 }).suggestions[2].text,
      "Supabase",
    );
    assert.equal(applyTypingCase("sup", "Supabase"), "Supabase");
    assert.equal(applyTypingCase("SUP", "Supabase"), "SUPABASE");
  });

  it("handles empty input, whitespace, and unknown prefixes", () => {
    const predictor = engine();
    const empty = predictor.getSuggestions({ text: "", cursorPosition: 0 });
    assert.equal(empty.currentWord, "");
    assert.deepEqual(empty.suggestions, []);
    assert.equal(predictor.getSuggestions({ text: "   ", cursorPosition: 3 }).suggestions.length, 0);
    assert.deepEqual(predictor.getSuggestions({ text: "zzzzqqq", cursorPosition: 7 }).suggestions, []);
  });

  it("does not suggest a word the user already finished", () => {
    const result = engine().getSuggestions({
      text: "education",
      cursorPosition: "education".length,
      limit: 10,
    });
    assert.equal(result.isCompleteWord, true);
    assert.equal(
      result.suggestions.some((suggestion) => suggestion.canonical.toLowerCase() === "education"),
      false,
    );
    assert.ok(result.suggestions.some((suggestion) => suggestion.canonical === "educational"));
  });

  it("stays fast on a long document", () => {
    const text = `${"alpha ".repeat(400)}edu`;
    const started = performance.now();
    const result = engine().getSuggestions({ text, cursorPosition: text.length });
    assert.ok(performance.now() - started < 50);
    assert.equal(result.currentWord, "edu");
    assert.equal(result.suggestions[0].text, "education");
  });

  it("matches unicode words", () => {
    const predictor = new PredictiveEngine({
      dictionary: [
        { word: "café", frequency: 10 },
        { word: "教育", frequency: 12 },
        { word: "naive", frequency: 3 },
      ],
    });
    assert.equal(predictor.getSuggestions({ text: "caf", cursorPosition: 3 }).suggestions[0].canonical, "café");
    assert.equal(predictor.getSuggestions({ text: "教", cursorPosition: "教".length }).suggestions[0].canonical, "教育");
  });

  it("replaces the whole token when the caret is in the middle of it", () => {
    const text = "I am education today";
    const cursor = text.indexOf("education") + 3;
    const result = engine().getSuggestions({ text, cursorPosition: cursor, limit: 10 });
    assert.equal(result.currentWord, "edu");
    const educational = result.suggestions.find((suggestion) => suggestion.canonical === "educational");
    assert.ok(educational);
    const applied = applySuggestion(text, educational.replaceStart, educational.replaceEnd, educational.text);
    assert.equal(applied.text, "I am educational today");
  });

  it("ranks personal vocabulary above a more common dictionary word", () => {
    const now = Date.now();
    const predictor = new PredictiveEngine({
      dictionary: [
        { word: "support", frequency: 88000 },
        { word: "suppose", frequency: 21000 },
        { word: "super", frequency: 45000 },
        { word: "Supabase", frequency: 15000 },
      ],
      userVocabulary: new MemoryUserVocabulary([
        { word: "Supabase", usageCount: 42, lastUsed: now },
      ]),
      clock: () => now,
    });
    const result = predictor.getSuggestions({ text: "sup", cursorPosition: 3 });
    assert.equal(result.suggestions[0].canonical, "Supabase");
    assert.equal(result.suggestions[0].text, "Supabase");
    assert.equal(result.suggestions[0].source, "personal");
    assert.ok(result.suggestions.some((suggestion) => suggestion.text === "support"));
  });

  it("learns an accepted word that was not in the dictionary", () => {
    const predictor = new PredictiveEngine({
      dictionary: [{ word: "both", frequency: 100 }],
    });
    predictor.accept("BotBuddy");
    const result = predictor.getSuggestions({ text: "bot", cursorPosition: 3 });
    assert.equal(result.suggestions[0].canonical, "BotBuddy");
    assert.equal(result.suggestions[0].source, "personal");
  });

  it("uses previous words as a local context signal", () => {
    const dictionaryEntries: DictionaryEntry[] = [
      { word: "educate", frequency: 90000 },
      { word: "education", frequency: 10000 },
    ];
    const phraseEntries: PhraseEntry[] = [{ phrase: "studying education", frequency: 50000 }];
    const bare = new PredictiveEngine({ dictionary: dictionaryEntries, phrases: phraseEntries });
    assert.equal(bare.getSuggestions({ text: "educ", cursorPosition: 4 }).suggestions[0].canonical, "educate");

    const sentence = "I am studying educ";
    const contextual = bare.getSuggestions({ text: sentence, cursorPosition: sentence.length });
    assert.equal(contextual.currentWord, "educ");
    assert.equal(contextual.suggestions[0]?.canonical, "education");
    assert.ok(contextual.suggestions.every((suggestion) => !/\s/u.test(suggestion.text)));
    const educationIndex = contextual.suggestions.findIndex(
      (suggestion) => suggestion.canonical === "education",
    );
    const educateIndex = contextual.suggestions.findIndex(
      (suggestion) => suggestion.canonical === "educate",
    );
    assert.ok(educationIndex >= 0);
    assert.ok(educateIndex >= 0);
    assert.ok(educationIndex < educateIndex);
  });

  it("completes only the current word", () => {
    const predictor = new PredictiveEngine({
      dictionary: [
        { word: "learning", frequency: 5000 },
        { word: "lead", frequency: 1000 },
      ],
      phrases: [{ phrase: "machine learning", frequency: 12000 }],
    });
    const text = "machine lea";
    const result = predictor.getSuggestions({ text, cursorPosition: text.length });
    assert.equal(result.currentWord, "lea");
    assert.deepEqual(
      result.suggestions.map((suggestion) => suggestion.canonical),
      ["learning", "lead"],
    );
    assert.ok(result.suggestions.every((suggestion) => suggestion.source !== "phrase"));
    const learning = result.suggestions[0];
    const applied = applySuggestion(text, learning.replaceStart, learning.replaceEnd, learning.text);
    assert.equal(applied.text, "machine learning");

    const prompt = "I would like to";
    const continuations = new PredictiveEngine({
      dictionary: [
        { word: "to", frequency: 100 },
        { word: "topic", frequency: 50 },
      ],
      phrases: [
        { phrase: "I would like to know", frequency: 7000 },
        { phrase: "I would like to request", frequency: 5000 },
        { phrase: "I would like to confirm", frequency: 4500 },
      ],
    }).getSuggestions({ text: prompt, cursorPosition: prompt.length, limit: 8 });
    assert.equal(continuations.isCompleteWord, true);
    assert.deepEqual(
      continuations.suggestions.map((suggestion) => suggestion.canonical),
      ["topic"],
    );
  });

  it("honors custom ranking weights", () => {
    const predictor = new PredictiveEngine({
      dictionary: [
        { word: "alpha", frequency: 10 },
        { word: "alpine", frequency: 99 },
      ],
      weights: {
        prefixWeight: 0,
        frequencyWeight: 1,
        userWeight: 0,
        recencyWeight: 0,
        contextWeight: 0,
      },
    });
    assert.equal(predictor.getSuggestions({ text: "al", cursorPosition: 2 }).suggestions[0].canonical, "alpine");
  });

  it("loads entries through a dictionary provider", () => {
    const provider = new LocalDictionaryProvider([
      { word: " education ", frequency: 5 },
      { word: "Education", frequency: 2 },
      { word: "", frequency: 1 },
      { word: "bad", frequency: -1 },
      { word: "two words", frequency: 3 },
    ]);
    assert.equal(provider.getEntries().length, 1);
    assert.equal(provider.getEntries()[0]?.word, "education");
    const result = new PredictiveEngine({ dictionary: provider }).getSuggestions({
      text: "edu",
      cursorPosition: 3,
    });
    assert.equal(result.suggestions[0]?.canonical, "education");
  });
});

describe("token boundaries", () => {
  it("keeps the cursor token when it is not at the end", () => {
    const text = "I am edu studying";
    const token = tokenAtCursor(text, text.indexOf("edu") + 3);
    assert.equal(token.prefix, "edu");
    assert.deepEqual(token.previousWords, ["I", "am"]);
  });
});

describe("keyboard navigation", () => {
  it("maps suggestion keys and wraps the active index", () => {
    assert.deepEqual(suggestionKeyAction("ArrowDown", { open: true, count: 3 }), { type: "next" });
    assert.deepEqual(suggestionKeyAction("ArrowUp", { open: true, count: 3 }), { type: "previous" });
    assert.deepEqual(suggestionKeyAction("Enter", { open: true, count: 3 }), { type: "accept" });
    assert.deepEqual(suggestionKeyAction("Tab", { open: true, count: 3 }), { type: "accept" });
    assert.deepEqual(suggestionKeyAction("Escape", { open: true, count: 3 }), { type: "dismiss" });
    assert.deepEqual(suggestionKeyAction("Enter", { open: false, count: 3 }), { type: "ignore" });
    assert.deepEqual(suggestionKeyAction("a", { open: true, count: 3 }), { type: "ignore" });
    assert.equal(moveActiveIndex(0, 3, -1), 2);
    assert.equal(moveActiveIndex(2, 3, 1), 0);
  });
});

describe("user vocabulary storage", () => {
  it("round-trips acceptances through a local storage implementation", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, stored: string) => {
        memory.set(key, stored);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
      clear: () => memory.clear(),
      key: () => null,
      length: 0,
    } as Storage;
    const first = new LocalStorageUserVocabulary(storage);
    const saved = first.record("Supabase", 1770000000000);
    assert.equal(saved.usageCount, 1);
    const second = new LocalStorageUserVocabulary(storage);
    const entry = second.lookup("supabase");
    assert.equal(entry?.word, "Supabase");
    assert.equal(entry?.usageCount, 1);
    assert.equal(entry?.lastUsed, 1770000000000);
    second.record("Supabase", 1770000001000);
    assert.equal(second.lookup("Supabase")?.usageCount, 2);
  });
});

describe("shipped dictionary", () => {
  it("includes the starter words and can complete them", () => {
    const words = new Set((dictionary as DictionaryEntry[]).map((entry) => entry.word.toLowerCase()));
    for (const word of ["education", "educational", "educator", "developer", "supabase", "support"]) {
      assert.equal(words.has(word), true, word);
    }
    const phraseTexts = new Set((phrases as PhraseEntry[]).map((entry) => entry.phrase.toLowerCase()));
    assert.equal(phraseTexts.has("machine learning"), true);
    const predictor = new PredictiveEngine({
      dictionary: dictionary as DictionaryEntry[],
      phrases: phrases as PhraseEntry[],
      userVocabulary: new MemoryUserVocabulary(),
    });
    const edu = predictor.getSuggestions({ text: "edu", cursorPosition: 3, limit: 20 });
    assert.ok(edu.suggestions.some((suggestion) => suggestion.canonical === "education"));
    const dev = predictor.getSuggestions({ text: "dev", cursorPosition: 3, limit: 20 });
    assert.ok(dev.suggestions.some((suggestion) => suggestion.canonical === "developer"));
    const sup = predictor.getSuggestions({ text: "sup", cursorPosition: 3, limit: 20 });
    assert.ok(sup.suggestions.some((suggestion) => suggestion.text === "Supabase"));
  });
});

describe("offline boundary", () => {
  it("does not call a network or model API", () => {
    const forbidden = [
      /\bfetch\s*\(/,
      /\baxios\b/,
      /\bopenai\b/i,
      /\banthropic\b/i,
      /\bXMLHttpRequest\b/,
      /\bgoogleapis\b/i,
      /\bdictionaryapi\b/i,
    ];
    const files = walk(root).filter((file) => !file.endsWith(".test.ts"));
    assert.ok(files.length > 5);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const pattern of forbidden) {
        assert.equal(pattern.test(source), false, `${file} matches ${pattern}`);
      }
    }
  });
});

function walk(directory: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if (/\.(ts|tsx)$/.test(name)) files.push(path);
  }
  return files;
}
