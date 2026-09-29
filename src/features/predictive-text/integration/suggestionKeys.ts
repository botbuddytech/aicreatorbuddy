export type SuggestionKeyAction =
  | { type: "ignore" }
  | { type: "next" }
  | { type: "previous" }
  | { type: "accept" }
  | { type: "dismiss" };

export function suggestionKeyAction(
  key: string,
  state: { open: boolean; count: number },
): SuggestionKeyAction {
  if (!state.open || state.count === 0) return { type: "ignore" };
  switch (key) {
    case "ArrowDown":
      return { type: "next" };
    case "ArrowUp":
      return { type: "previous" };
    case "Enter":
    case "Tab":
      return { type: "accept" };
    case "Escape":
      return { type: "dismiss" };
    default:
      return { type: "ignore" };
  }
}

export function moveActiveIndex(current: number, count: number, direction: 1 | -1): number {
  if (count <= 0) return 0;
  return (current + direction + count) % count;
}
