// Word handling shared by /suggest and /search. A match counts only when the query and the
// candidate share significant words, never because of a ranking score (bm25 is not
// comparable between tables).

const STOPWORDS = new Set(
  (
    'a about above after again all also am an and any are as at be because been before being below between both but ' +
    'by can could did do does doing down during each few for from further had has have having he her here hers him his ' +
    'how i if in into is it its just me more most my no nor not of off on once only or other our out over own same she ' +
    'should so some such than that the their them then there these they this those through to too under until up very ' +
    'was we were what when where which while who whom why will with would you your'
  ).split(' '),
);

export function tokens(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

// Light stemmer plus the irregular forms that matter in protest wording.
const IRREGULAR: Record<string, string> = { withdrew: 'withdraw', withdrawn: 'withdraw', held: 'hold', saw: 'see', seen: 'see' };

export function stem(word: string): string {
  if (Object.hasOwn(IRREGULAR, word)) return IRREGULAR[word];
  return word.replace(/(ing|ed|es|s|ly)$/, (m, _s, offset: number) => (offset >= 3 ? '' : m));
}

export function significantStems(text: string): Set<string> {
  const out = new Set<string>();
  for (const t of tokens(text)) {
    if (STOPWORDS.has(t)) continue;
    if (t.length < 3 && !/\d/.test(t)) continue;
    out.add(stem(t));
  }
  return out;
}

export function sharedCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n;
}

// Last `max` words of the text, ending at the cursor. Callers pass the text since the last
// full stop or line break.
export function lastWords(text: string, max: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(-max).join(' ');
}

// FTS5 MATCH expression from free text: significant words only, each quoted so punctuation or
// operators in the input cannot throw. `prefix` makes the last word match as a prefix (Ctrl+K).
export function ftsExpression(text: string, joiner: 'AND' | 'OR', prefix = false): string | null {
  const words = [...new Set(tokens(text).filter((t) => !STOPWORDS.has(t) && (t.length >= 2 || /\d/.test(t))))];
  if (words.length === 0) return null;
  return words.map((w, i) => `"${w}"${prefix && i === words.length - 1 ? '*' : ''}`).join(` ${joiner} `);
}
