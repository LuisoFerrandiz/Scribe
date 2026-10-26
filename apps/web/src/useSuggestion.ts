import { useEffect, useState } from 'react';
import { api } from './api';
import { queryBefore } from './suggestQuery';
import type { SectionKey, Suggestion } from './types';

const IDLE_MS = 600;
const MAX_TEXT = 4000;

// The library has no Rules Applicable box, so that section only gets rule citations.
const BOX_OF: Record<SectionKey, string> = {
  procedural: 'procedural_matters',
  facts: 'facts_found',
  conclusion: 'conclusion',
  rules_text: 'rules_text',
  decision: 'decision',
};

// RF-005: one phrase or one citation for the text being written. It disappears as soon as the
// text or the cursor moves (so Tab can never insert something stale) and is asked again 600 ms
// after typing stops. Any failure just means no suggestion.
export function useSuggestion(
  caseId: number,
  section: SectionKey,
  value: string,
  caret: number,
  active: boolean,
): [Suggestion | null, () => void] {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  useEffect(() => {
    setSuggestion(null);
    if (!active) return;
    const q = queryBefore(value, caret);
    if (!q) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api
        .suggest({ q, box: BOX_OF[section], caseId, text: value.slice(-MAX_TEXT) }, controller.signal)
        .then((r) => {
          const phrase: Suggestion | null = r.phrase ? { kind: 'phrase', ...r.phrase } : null;
          const rule: Suggestion | null = r.rule ? { kind: 'rule', ...r.rule, typed: r.rule.typed === true } : null;
          // A rule number the scribe typed wins; otherwise the phrase, then the rule.
          setSuggestion(rule?.kind === 'rule' && rule.typed ? rule : (phrase ?? rule));
        })
        .catch(() => undefined);
    }, IDLE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [caseId, section, value, caret, active]);

  return [suggestion, () => setSuggestion(null)];
}
