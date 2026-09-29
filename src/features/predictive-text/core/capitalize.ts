/** Lookup key. Display text stays in dictionary casing unless the user shouted or capitalized. */
export function normalizeKey(value: string): string {
  return value.toLowerCase();
}

export function applyTypingCase(typed: string, canonical: string): string {
  if (!typed || !canonical) return canonical;
  if (!/\p{L}/u.test(typed)) return canonical;
  if (isShouting(typed)) return canonical.toUpperCase();
  if (isCapitalized(typed)) {
    const chars = [...canonical];
    if (chars.length === 0) return canonical;
    return chars[0].toUpperCase() + chars.slice(1).join("").toLowerCase();
  }
  return canonical;
}

function isShouting(value: string): boolean {
  const letters = [...value].filter((char) => /\p{L}/u.test(char));
  return (
    letters.length >= 2 &&
    letters.every((char) => char === char.toUpperCase() && char !== char.toLowerCase())
  );
}

function isCapitalized(value: string): boolean {
  const chars = [...value];
  if (chars.length === 0) return false;
  const [first, ...rest] = chars;
  const headIsUpper = first === first.toUpperCase() && first !== first.toLowerCase();
  const tail = rest.join("");
  return headIsUpper && (tail.length === 0 || tail === tail.toLowerCase());
}
