import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import type { SearchResponse, SearchRule, Suggestion } from '../types';

const DEBOUNCE_MS = 200;

const BOX_LABEL: Record<string, string> = {
  procedural_matters: 'Procedural',
  facts_found: 'Facts',
  conclusion: 'Conclusion',
  decision: 'Decision',
};

interface Item {
  key: string;
  group: string;
  tag: string;
  title: string;
  detail: string;
  doc?: string;
  suggestion: Suggestion | null; // null: shown but cannot be inserted
}

function ruleItem(r: SearchRule, group: string): Item {
  return {
    key: `${r.source}-${r.section_id}`,
    group,
    tag: r.citation ?? 'No citation',
    title: r.heading,
    detail: r.excerpt,
    doc: r.doc_title,
    suggestion: r.citation
      ? { kind: 'rule', citation: r.citation, heading: r.heading, doc_title: r.doc_title, typed: false }
      : null,
  };
}

// The number of a citation, "RRS 63.1" -> "63.1".
const numberOf = (citation: string | null) => citation?.replace(/^\S+\s+/, '').toLowerCase() ?? '';

function itemsOf(r: SearchResponse | null, query: string): Item[] {
  if (!r) return [];
  const typed = query.replace(/\s+/g, '').toLowerCase();
  // A typed rule number ("rule 63.1") puts the rule groups before the phrases.
  const exactRule = [...r.rrs, ...r.event].some((x) => /\d/.test(numberOf(x.citation)) && typed.includes(numberOf(x.citation)));
  const phrases: Item[] = r.phrases.map(
    (p): Item => ({
      key: `p-${p.id}`,
      group: 'Phrases',
      tag: BOX_LABEL[p.box] ?? p.box,
      title: p.label,
      detail: p.body,
      suggestion: { kind: 'phrase', id: p.id, label: p.label, body: p.body },
    }),
  );
  const rules = [...r.rrs.map((x) => ruleItem(x, 'RRS')), ...r.event.map((x) => ruleItem(x, 'Event documents'))];
  return exactRule ? [...rules, ...phrases] : [...phrases, ...rules];
}

// RF-006: one box, three sources queried separately (at most 5 each). Enter inserts the chosen
// phrase text or verified citation at the cursor; Esc closes without touching the document.
export function SearchDialog({
  caseId,
  onPick,
  onClose,
}: {
  caseId: number;
  onPick: (s: Suggestion) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setIndex(0);
    if (!query.trim()) {
      setResults(null);
      setFailed(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api
        .search(query, caseId, controller.signal)
        .then((r) => {
          setResults(r);
          setFailed(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) setFailed(true);
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, caseId]);

  const items = useMemo(() => itemsOf(results, query), [results, query]);

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [index, items]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = items[index]?.suggestion;
      if (chosen) onPick(chosen);
    }
  }

  let lastGroup = '';
  return (
    <div className="search-overlay" onMouseDown={onClose}>
      <div className="search-box" role="dialog" aria-label="Search" onMouseDown={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search phrases, RRS and event documents…"
          aria-label="Search"
        />
        <ul ref={listRef}>
          {items.map((it, i) => {
            const heading = it.group !== lastGroup ? it.group : null;
            lastGroup = it.group;
            return (
              <li key={it.key}>
                {heading && <div className="search-group">{heading}</div>}
                <div
                  className={`search-item${it.suggestion ? '' : ' disabled'}`}
                  aria-selected={i === index}
                  onMouseMove={() => i !== index && setIndex(i)}
                  onClick={() => it.suggestion && onPick(it.suggestion)}
                >
                  <div className="search-head">
                    <span className="tag">{it.tag}</span>
                    <strong>{it.title}</strong>
                    {it.doc && <span className="muted">{it.doc}</span>}
                  </div>
                  <div className="search-detail">{it.detail}</div>
                </div>
              </li>
            );
          })}
        </ul>
        {failed && <p className="error search-note">Search is not available right now.</p>}
        {!failed && query.trim() && results && items.length === 0 && <p className="muted search-note">No results.</p>}
        <p className="muted search-note">Enter inserts · ↑↓ choose · Esc closes</p>
      </div>
    </div>
  );
}
