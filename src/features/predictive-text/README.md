# Predictive text

Word completion stays local. The trie, dictionary, and ranking code do not call the network. Restart the dev server after editing `data/dictionary.json`.

## Suggestion source

Set `NEXT_PUBLIC_SUGGESTION_SOURCE` in the environment. This project uses Next.js, so a `VITE_` variable is not read.

| Value | Behavior |
| --- | --- |
| `local` | Complete the word at the caret from the local dictionary. |
| `remote` | Ask `/api/suggest`, which proxies Google's unofficial suggest endpoint. If that returns nothing, fall back to local words. |
| `hybrid` (default) | Show local words immediately, then add remote phrases. Local rows stay first. Duplicates are removed. The list is capped at 8. |

Restart `next dev` after changing the variable so the client bundle picks it up.

Accepting a word replaces only the word at the caret. Accepting a remote phrase replaces the whole input, or the current sentence in a textarea. Accepted words are still stored in local user vocabulary. A phrase is stored as separate words.

## Add another provider

Remote calls are chosen in one place: `createRemoteProvider` in `src/features/suggestions/createSuggestionProvider.ts`. Implement `SuggestionProvider` (`name` and `getSuggestions`) and return it from that function.

```ts
export function createRemoteProvider(): SuggestionProvider {
  return createGoogleSuggestProvider();
}
```

## Google suggest is unofficial

`/api/suggest` forwards queries to `https://suggestqueries.google.com/complete/search`. That endpoint is not a supported Google API. It can rate-limit, block, or disappear without notice. Do not depend on it for production. Leave the variable unset, or set it to `hybrid`, to show Google phrases. Set it to `local` when the field should stay offline.
