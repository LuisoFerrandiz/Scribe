import type { Suggestion } from './types';

// RF-005: the text the suggestion line asks about, and how a chosen suggestion is inserted.

const QUERY_WORDS = 12;
// A rule number typed at the end of the text: "rule 63.1", "RRS 44.1(b", "CR 3".
const TYPED_RULE_AT_END = /\b(?:rrs|rule|cr|nor|si)\s*\.?\s*[a-z]{0,2}\d+(?:\.\d+)*(?:\([a-z0-9]*\)?)*$/i;

// Text written since the last full stop or line break, up to the cursor, at most 12 words.
// A dot inside a number ("63.1") is not a full stop.
export function queryBefore(value: string, caret: number): string {
  const before = value.slice(0, caret);
  let cut = 0;
  for (const m of before.matchAll(/[.!?](?=\s)|\n/g)) cut = m.index! + 1;
  const words = before.slice(cut).trim().split(/\s+/).filter(Boolean);
  return words.slice(-QUERY_WORDS).join(' ');
}

export function suggestionText(s: Suggestion): string {
  return s.kind === 'phrase' ? s.body : s.citation;
}

// Inserts at the cursor without touching the selection. A rule number the scribe already typed
// ("rule 63.1") is replaced by the verified citation instead of being repeated.
export function applySuggestion(
  value: string,
  caret: number,
  s: Suggestion,
): { value: string; caret: number } {
  const before = value.slice(0, caret);
  const after = value.slice(caret);
  let head = before;
  if (s.kind === 'rule' && s.typed) {
    const m = TYPED_RULE_AT_END.exec(before);
    if (m) head = before.slice(0, m.index);
  }
  const needsSpace = head.length > 0 && !/[\s(]$/.test(head);
  const inserted = (needsSpace ? ' ' : '') + suggestionText(s);
  return { value: head + inserted + after, caret: head.length + inserted.length };
}
