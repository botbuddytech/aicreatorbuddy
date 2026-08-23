"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";

type Tone = "default" | "accent" | "white";

type Segment = { text: string; tone?: Tone };

const PHRASE_ONE: Segment[] = [
  { text: "From " },
  { text: "Script", tone: "accent" },
  { text: " To " },
  { text: "Published", tone: "white" },
  { text: " " },
  { text: "Video", tone: "accent" },
];

const PHRASE_TWO: Segment[] = [
  { text: "Across " },
  { text: "Every", tone: "white" },
  { text: " " },
  { text: "Channel", tone: "accent" },
  { text: " You Run" },
];

const PHRASES = [PHRASE_ONE, PHRASE_TWO] as const;

type CharToken = { char: string; tone: Tone };

type Phase = "type" | "hold" | "delete" | "next";

function flattenSegments(segments: Segment[]): CharToken[] {
  return segments.flatMap((segment) =>
    Array.from(segment.text).map((char) => ({
      char,
      tone: segment.tone ?? "default",
    })),
  );
}

function toneClass(tone: Tone): string {
  if (tone === "accent") return "text-accent";
  if (tone === "white") return "text-white";
  return "";
}

function groupIntoWords(tokens: CharToken[]): CharToken[][] {
  const words: CharToken[][] = [];
  let current: CharToken[] = [];

  for (const token of tokens) {
    if (token.char === " ") {
      if (current.length) {
        words.push(current);
        current = [];
      }
      words.push([token]);
    } else {
      current.push(token);
    }
  }
  if (current.length) words.push(current);
  return words;
}

type TypewriterHeadlineProps = {
  className?: string;
  charMs?: number;
  deleteMs?: number;
  holdMs?: number;
};

export function TypewriterHeadline({
  className = "",
  charMs = 72,
  deleteMs = 36,
  holdMs = 1800,
}: TypewriterHeadlineProps) {
  const reduce = useReducedMotion();
  const phrases = useMemo(() => PHRASES.map((p) => flattenSegments([...p])), []);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const tokens = phrases[phraseIndex];
  const len = tokens.length;

  const [visible, setVisible] = useState(reduce ? len : 0);
  const [phase, setPhase] = useState<Phase>(reduce ? "hold" : "type");

  useEffect(() => {
    if (reduce) {
      setVisible(phrases[0].length);
      setPhraseIndex(0);
      setPhase("hold");
      return;
    }

    let cancelled = false;
    let intervalId = 0;
    let timeoutId = 0;

    const clearTimers = () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };

    if (phase === "type") {
      let n = 0;
      setVisible(0);
      intervalId = window.setInterval(() => {
        if (cancelled) return;
        n += 1;
        setVisible(n);
        if (n >= len) {
          window.clearInterval(intervalId);
          setPhase("hold");
        }
      }, charMs);
    }

    if (phase === "hold") {
      timeoutId = window.setTimeout(() => {
        if (!cancelled) setPhase("delete");
      }, holdMs);
    }

    if (phase === "delete") {
      let n = len;
      setVisible(len);
      intervalId = window.setInterval(() => {
        if (cancelled) return;
        n -= 1;
        setVisible(Math.max(0, n));
        if (n <= 0) {
          window.clearInterval(intervalId);
          setPhase("next");
        }
      }, deleteMs);
    }

    if (phase === "next") {
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        setPhraseIndex((i) => (i + 1) % phrases.length);
        setPhase("type");
      }, 350);
    }

    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [phase, phraseIndex, reduce, len, charMs, deleteMs, holdMs, phrases]);

  const shown = tokens.slice(0, visible);
  const words = groupIntoWords(shown);

  return (
    <h1 className={className}>
      <span className="sr-only">
        From script to published video, across every channel you run.
      </span>
      <span aria-hidden className="inline whitespace-nowrap">
        {words.map((word, wordIndex) => {
          const isSpace = word.length === 1 && word[0].char === " ";
          if (isSpace) {
            return <span key={`sp-${wordIndex}`}> </span>;
          }
          return (
            <span key={`w-${wordIndex}`} className="whitespace-nowrap">
              {word.map((token, charIndex) => (
                <span
                  key={`${phraseIndex}-${wordIndex}-${charIndex}`}
                  className={`hero-type-char ${toneClass(token.tone)}`}
                >
                  {token.char}
                </span>
              ))}
            </span>
          );
        })}
        <span
          className={`ml-0.5 inline-block h-[0.9em] w-[0.08em] translate-y-[0.08em] bg-accent align-baseline ${
            phase === "hold" ? "hero-type-caret--blink" : "opacity-100"
          }`}
        />
      </span>
    </h1>
  );
}
