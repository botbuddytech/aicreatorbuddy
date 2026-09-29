export type TextToken = {
  text: string;
  start: number;
  end: number;
};

export type CursorToken = {
  word: string;
  prefix: string;
  start: number;
  end: number;
  previousWords: string[];
  previousTokens: TextToken[];
};

type CharSpan = {
  char: string;
  start: number;
  end: number;
};

export function tokenAtCursor(text: string, cursorPosition: number): CursorToken {
  const cursor = clamp(cursorPosition, 0, text.length);
  const chars = splitChars(text);
  let charIndex = -1;
  for (let index = 0; index < chars.length; index += 1) {
    if (chars[index].end <= cursor) charIndex = index;
  }

  while (charIndex >= 0 && !isWordChar(chars[charIndex].char)) {
    if (isSpace(chars[charIndex].char)) {
      charIndex = -1;
      break;
    }
    charIndex -= 1;
  }

  const tokens = collectTokens(text, chars);
  if (charIndex < 0) {
    return {
      word: "",
      prefix: "",
      start: cursor,
      end: cursor,
      previousWords: tokens.filter((token) => token.end <= cursor).map((token) => token.text),
      previousTokens: tokens.filter((token) => token.end <= cursor),
    };
  }

  let startIndex = charIndex;
  while (startIndex > 0 && isWordChar(chars[startIndex - 1].char)) startIndex -= 1;
  let endIndex = charIndex;
  while (endIndex + 1 < chars.length && isWordChar(chars[endIndex + 1].char)) endIndex += 1;

  const start = chars[startIndex].start;
  const end = chars[endIndex].end;
  const word = text.slice(start, end);
  const prefix = cursor >= end ? word : text.slice(start, Math.max(start, cursor));
  const tokenIndex = tokens.findIndex((token) => token.start === start && token.end === end);
  const previousTokens = tokenIndex > 0 ? tokens.slice(0, tokenIndex) : [];

  return {
    word,
    prefix,
    start,
    end,
    previousWords: previousTokens.map((token) => token.text),
    previousTokens,
  };
}

function collectTokens(text: string, chars: readonly CharSpan[]): TextToken[] {
  const tokens: TextToken[] = [];
  let index = 0;
  while (index < chars.length) {
    if (!isWordChar(chars[index].char)) {
      index += 1;
      continue;
    }
    const start = chars[index].start;
    let end = chars[index].end;
    index += 1;
    while (index < chars.length && isWordChar(chars[index].char)) {
      end = chars[index].end;
      index += 1;
    }
    tokens.push({ text: text.slice(start, end), start, end });
  }
  return tokens;
}

function splitChars(text: string): CharSpan[] {
  const chars: CharSpan[] = [];
  for (let index = 0; index < text.length; ) {
    const code = text.codePointAt(index);
    if (code === undefined) break;
    const char = String.fromCodePoint(code);
    chars.push({ char, start: index, end: index + char.length });
    index += char.length;
  }
  return chars;
}

function isWordChar(char: string): boolean {
  return /[\p{L}\p{N}']/u.test(char);
}

function isSpace(char: string): boolean {
  return /\s/u.test(char);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
