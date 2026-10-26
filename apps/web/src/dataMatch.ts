// RF-004: complete a name, boat or sail number of the case from its first characters.

const MIN_TYPED = 2;
const TAIL_CHARS = 60;

const isAlnum = (ch: string) => /[\p{L}\p{N}]/u.test(ch);

// Start offsets of each word in the term ("Ana Beltran" -> 0 and 4).
function wordStarts(term: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < term.length; i++) {
    if (isAlnum(term[i]) && (i === 0 || !isAlnum(term[i - 1]))) out.push(i);
  }
  return out;
}

// Longest typed prefix of `term` (starting at a word start) that the text before the cursor
// ends with. The first typed letter must match in case, so lower-case prose ("he") does not
// trigger a name ("Henrik"). len 0 when nothing of at least MIN_TYPED characters matches.
function typedMatch(tail: string, term: string): { len: number; start: number } {
  let best = { len: 0, start: 0 };
  for (const start of wordStarts(term)) {
    const maxLen = Math.min(term.length - start - 1, tail.length); // at least one char left to add
    for (let len = maxLen; len >= MIN_TYPED && len > best.len; len--) {
      const typed = term.slice(start, start + len);
      const written = tail.slice(tail.length - len);
      const before = tail[tail.length - len - 1];
      if (written[0] !== typed[0]) continue;
      if (written.toLowerCase() !== typed.toLowerCase()) continue;
      if (before !== undefined && isAlnum(before)) continue; // typed part must begin a word
      best = { len, start };
      break;
    }
  }
  return best;
}

// The text to add after the cursor, only when exactly one term fits the longest typed match.
export function matchData(textBeforeCursor: string, terms: string[]): string | null {
  const tail = textBeforeCursor.slice(-TAIL_CHARS);
  let longest = 0;
  const hits = new Map<string, string>(); // lower-cased term -> text to add
  for (const term of terms) {
    const { len, start } = typedMatch(tail, term);
    if (len === 0) continue;
    if (len > longest) {
      longest = len;
      hits.clear();
    }
    if (len === longest) hits.set(term.toLowerCase(), term.slice(start + len));
  }
  if (hits.size !== 1) return null;
  return [...hits.values()][0];
}
