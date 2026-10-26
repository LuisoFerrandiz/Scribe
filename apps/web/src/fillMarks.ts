// SPEC-007: the marks a phrase can carry, and the text changes that resolve them.
//   [a|b|c]   alternatives, the scribe keeps one (2 to 9 options)
//   {name}    a datum the scribe types, or accepts when the app knows it
// Anything else that looks like a mark (a bracket with no "|", an unclosed or nested bracket, an empty
// option, more than 9 options) is plain text and is left exactly as it is (D-007).

export interface ChoiceMark {
  kind: 'choice';
  start: number;
  end: number; // exclusive
  options: string[];
}
export interface HoleMark {
  kind: 'hole';
  start: number;
  end: number;
  name: string;
}
export type Mark = ChoiceMark | HoleMark;

const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 9;
const HOLE = /^\{([^{}[\]|\n]{1,40})\}/;

// The index of the "]" that closes the "[" at `open`, or -1 when it is never closed. `nested` tells
// whether another "[" is opened before it closes.
function closing(text: string, open: number, limit: number): { close: number; nested: boolean } {
  let depth = 0;
  let nested = false;
  for (let i = open; i < limit; i++) {
    const c = text[i];
    if (c === '[') {
      depth++;
      if (depth > 1) nested = true;
    } else if (c === ']') {
      depth--;
      if (depth === 0) return { close: i, nested };
    }
  }
  return { close: -1, nested };
}

// The valid marks of text[from, to), in order. Nothing is stored: call it again after any change.
export function findMarks(text: string, from = 0, to = text.length): Mark[] {
  const marks: Mark[] = [];
  let i = from;
  while (i < to) {
    const c = text[i];
    if (c === '[') {
      const { close, nested } = closing(text, i, to);
      if (close === -1) {
        i++; // never closed: this "[" is plain text
        continue;
      }
      if (nested) {
        i = close + 1; // a bracket inside a bracket is too ambiguous to touch
        continue;
      }
      const options = text.slice(i + 1, close).split('|');
      const ok = options.length >= MIN_OPTIONS && options.length <= MAX_OPTIONS && options.every((o) => o.trim() !== '');
      if (ok) {
        marks.push({ kind: 'choice', start: i, end: close + 1, options });
        i = close + 1;
      } else {
        i++; // plain text in brackets: look inside it for data marks
      }
      continue;
    }
    if (c === '{') {
      const m = HOLE.exec(text.slice(i, to));
      if (m && m[1].trim() !== '') {
        marks.push({ kind: 'hole', start: i, end: i + m[0].length, name: m[1].trim() });
        i += m[0].length;
        continue;
      }
    }
    i++;
  }
  return marks;
}

export const hasMarks = (text: string) => findMarks(text).length > 0;

// The text with `mark` replaced by `replacement`; the replacement can carry its own data marks.
export function replaceMark(text: string, mark: Mark, replacement: string): string {
  return text.slice(0, mark.start) + replacement + text.slice(mark.end);
}

// A block of inserted text being filled in, [start, end) of the section text.
export interface Block {
  start: number;
  end: number;
}

// The first mark of the block that starts at or after `from`.
export function nextMark(text: string, block: Block, from: number): Mark | null {
  return findMarks(text, block.start, block.end).find((m) => m.start >= from) ?? null;
}

// The block after an edit, or null when the edit touches anything outside it. The edit is found by
// comparing the old and the new text: what both share at the start and at the end did not change.
export function blockAfterEdit(before: string, after: string, block: Block): Block | null {
  let prefix = 0;
  const max = Math.min(before.length, after.length);
  while (prefix < max && before[prefix] === after[prefix]) prefix++;
  let suffix = 0;
  while (suffix < max - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix++;
  const editStart = prefix;
  const editEnd = before.length - suffix; // in the old text
  if (editStart < block.start || editEnd > block.end) return null;
  return { start: block.start, end: block.end + (after.length - before.length) };
}
