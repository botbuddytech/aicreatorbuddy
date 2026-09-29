"use client";

import { useRef } from "react";
import { getPredictiveEngine } from "@/features/predictive-text/client/getPredictiveEngine";
import { collectSuggestions } from "./composeSuggestions";
import { createRemoteProvider, currentSuggestionSource } from "./createSuggestionProvider";
import { createLocalProvider, type LocalSuggestionProvider } from "./providers/localProvider";
import type { ComposedSuggestion, SuggestionProvider } from "./types";

export function useSuggestionLoader() {
  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const localRef = useRef<LocalSuggestionProvider | null>(null);
  const remoteRef = useRef<SuggestionProvider | null>(null);

  function localProvider() {
    if (!localRef.current) localRef.current = createLocalProvider(getPredictiveEngine());
    return localRef.current;
  }

  function remoteProvider() {
    if (!remoteRef.current) remoteRef.current = createRemoteProvider();
    return remoteRef.current;
  }

  function stop() {
    requestId.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
  }

  function load(
    text: string,
    cursor: number,
    onUpdate: (items: ComposedSuggestion[], phase: "replace" | "merge") => void,
  ) {
    requestId.current += 1;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const id = requestId.current;
    void collectSuggestions({
      mode: currentSuggestionSource(),
      text,
      cursorPosition: cursor,
      signal: controller.signal,
      local: localProvider(),
      remote: remoteProvider(),
      onUpdate: (items, phase) => {
        if (id !== requestId.current || controller.signal.aborted) return;
        onUpdate(items, phase);
      },
    });
  }

  function acceptWords(text: string) {
    localProvider().acceptWords(text);
  }

  return { load, stop, acceptWords };
}
