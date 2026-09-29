import { readSuggestionSource } from "./composeSuggestions";
import { createGoogleSuggestProvider, type GoogleSuggestOptions } from "./providers/googleSuggestProvider";
import type { SuggestionProvider, SuggestionSourceMode } from "./types";

/** Change this function to point remote suggestions at a different API. */
export function createRemoteProvider(options?: GoogleSuggestOptions): SuggestionProvider {
  return createGoogleSuggestProvider(options);
}

export function currentSuggestionSource(): SuggestionSourceMode {
  return readSuggestionSource(process.env.NEXT_PUBLIC_SUGGESTION_SOURCE);
}

export function createSuggestionProvider(mode: SuggestionSourceMode = currentSuggestionSource()) {
  return {
    mode,
    remote: createRemoteProvider(),
  };
}
