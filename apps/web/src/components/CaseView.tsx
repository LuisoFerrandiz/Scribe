import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { copyText, downloadText, fileName, fullText } from '../docFormat';
import { ReadingView } from './ReadingView';
import { ProtestFormDialog } from './ProtestFormDialog';
import { SearchDialog } from './SearchDialog';
import { matchData } from '../dataMatch';
import { applySuggestion, suggestionText } from '../suggestQuery';
import { useSuggestion } from '../useSuggestion';
import { useCaseDoc, type SaveStatus } from '../useCaseDoc';
import {
  SECTION_KEYS,
  SECTION_LABEL,
  type CaseFull,
  type PartyRow,
  type SectionKey,
  type Suggestion,
} from '../types';

const ROLE_LABEL: Record<PartyRow['role'], string> = {
  protestor: 'Protestor',
  respondent: 'Respondent',
  other: 'Party',
};
const KIND_LABEL: Record<string, string> = { protest: 'Protest', redress: 'Redress', reopening: 'Reopening' };
const STATUS_LABEL: Record<SaveStatus, string> = {
  saved: 'Saved',
  saving: 'Saving…',
  offline: 'Offline – will retry',
  failed: 'Not saved',
};
// Parties shown inline in the header; more than this fold into "Parties (N)".
const INLINE_PARTIES = 4;

const partyText = (p: PartyRow) =>
  `${ROLE_LABEL[p.role]}: ${[p.name, p.boat_name, p.sail_number].filter(Boolean).join(', ') || '—'}`;

function Header({ c, status, children }: { c: CaseFull; status: SaveStatus; children?: ReactNode }) {
  const kinds = c.kinds.split(',').map((k) => KIND_LABEL[k] ?? k).join(' + ');
  return (
    <header className="doc-header">
      <div className="doc-title">
        <a href="#/">← Cases</a>
        <strong>Case {c.case_number}</strong>
        <span className="muted">
          {c.event_name} · {kinds}
          {c.hearing_at ? ` · ${c.hearing_at.replace('T', ' ')}` : ''}
        </span>
        <span className="spacer" />
        <span className={`status status-${status}`} role="status">
          {STATUS_LABEL[status]}
        </span>
      </div>
      {c.parties.length <= INLINE_PARTIES ? (
        <ul className="parties">
          {c.parties.map((p) => (
            <li key={p.id}>{partyText(p)}</li>
          ))}
        </ul>
      ) : (
        <details className="parties">
          <summary>Parties ({c.parties.length})</summary>
          <ul>
            {c.parties.map((p) => (
              <li key={p.id}>{partyText(p)}</li>
            ))}
          </ul>
        </details>
      )}
      {c.witnesses.length > 0 && (
        <p className="muted witnesses">Witnesses: {c.witnesses.map((w) => w.name || '—').join(', ')}</p>
      )}
      <div className="doc-tools">{children}</div>
    </header>
  );
}

// What the page needs from a section: where the cursor is, and a way to put text back into it.
interface SectionHandle {
  hasFocus: () => boolean;
  selection: () => { start: number; end: number };
  restore: (sel: { start: number; end: number }) => void;
  insert: (s: Suggestion, at: number) => void;
}

interface SectionProps {
  caseId: number;
  sectionKey: SectionKey;
  label: string;
  value: string;
  terms: string[];
  onChange: (v: string) => void;
  onFocusSection: () => void;
  copied: boolean;
  onCopy: () => void;
}

const Section = forwardRef<SectionHandle, SectionProps>(function Section(
  { caseId, sectionKey, label, value, terms, onChange, onFocusSection, copied, onCopy },
  handleRef,
) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState(0);
  // Where Esc dismissed a suggestion; typing anything changes the length and brings it back.
  const [dismissed, setDismissed] = useState<{ caret: number; length: number } | null>(null);
  const pendingCaret = useRef<number | null>(null);
  const composing = useRef(false);
  const [focused, setFocused] = useState(false);

  // Grows with the text so the page scrolls, never the box.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    if (pendingCaret.current !== null) {
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  }, [value]);

  // RF-004: only at the end of a word, so the grey text never sits over typed text.
  const ghost = useMemo(() => {
    if (composing.current || (dismissed && dismissed.caret === caret && dismissed.length === value.length)) {
      return null;
    }
    const next = value[caret];
    if (next !== undefined && !/\s/.test(next)) return null;
    return matchData(value.slice(0, caret), terms);
  }, [value, caret, terms, dismissed]);

  const [suggestion, clearSuggestion] = useSuggestion(caseId, sectionKey, value, caret, focused && !ghost);

  useImperativeHandle(
    handleRef,
    () => ({
      hasFocus: () => document.activeElement === ref.current,
      selection: () => ({ start: ref.current?.selectionStart ?? 0, end: ref.current?.selectionEnd ?? 0 }),
      restore: ({ start, end }) => {
        ref.current?.focus();
        ref.current?.setSelectionRange(start, end);
        setCaret(start);
      },
      // Inserts after the selection, never replacing it (RF-006).
      insert: (s, at) => {
        const next = applySuggestion(value, at, s);
        pendingCaret.current = next.caret;
        onChange(next.value);
        setCaret(next.caret);
        clearSuggestion();
        ref.current?.focus();
      },
    }),
    [value, onChange, clearSuggestion],
  );

  // Tab and Esc act only on something visible: the grey completion first, then the suggestion
  // line. With neither visible they keep their normal meaning.
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Tab' && !e.shiftKey) {
      if (ghost) {
        e.preventDefault();
        pendingCaret.current = caret + ghost.length;
        onChange(value.slice(0, caret) + ghost + value.slice(caret));
        setCaret(caret + ghost.length);
      } else if (suggestion) {
        e.preventDefault();
        const next = applySuggestion(value, caret, suggestion);
        pendingCaret.current = next.caret;
        onChange(next.value);
        setCaret(next.caret);
        clearSuggestion();
      }
    } else if (e.key === 'Escape') {
      if (ghost) {
        e.preventDefault();
        setDismissed({ caret, length: value.length });
      } else if (suggestion) {
        e.preventDefault();
        clearSuggestion();
      }
    }
  }

  return (
    <section className="doc-section">
      <div className="section-head">
        <h2>{label}</h2>
        <button className="ghost copy-btn" onMouseDown={(e) => e.preventDefault()} onClick={onCopy} tabIndex={-1}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="field">
        <div className="mirror" aria-hidden="true">
          <span>{value.slice(0, caret)}</span>
          {ghost && <span className="ghost">{ghost}</span>}
          <span>{value.slice(caret) + '\n'}</span>
        </div>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => {
            setCaret(e.target.selectionStart);
            onChange(e.target.value);
          }}
          onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
          onKeyDown={onKeyDown}
          onCompositionStart={() => (composing.current = true)}
          onCompositionEnd={(e) => {
            composing.current = false;
            setCaret(e.currentTarget.selectionStart);
          }}
          onFocus={() => {
            setFocused(true);
            onFocusSection();
          }}
          onBlur={() => setFocused(false)}
          lang="en"
          spellCheck
          rows={3}
          aria-label={label}
        />
      </div>
      {/* Fixed height so a suggestion appearing never moves the text being written. */}
      <div className="suggest-line" aria-live="off">
        {focused && suggestion && (
          <>
            <span className="tag">{suggestion.kind === 'phrase' ? 'Phrase' : 'Rule'}</span>
            <span className="text">{suggestionText(suggestion)}</span>
            {suggestion.kind === 'rule' && <span className="muted">{suggestion.heading}</span>}
            <span className="hint">Tab</span>
          </>
        )}
      </div>
    </section>
  );
});

export function CaseView({ caseId, onAuthLost }: { caseId: number; onAuthLost: () => void }) {
  const { data, sections, status, loadError, replacedCopy, edit, restoreCopy, dismissCopy, updateCase } = useCaseDoc(
    caseId,
    onAuthLost,
  );
  const sectionRefs = useRef<Partial<Record<SectionKey, SectionHandle>>>({});
  const lastSection = useRef<SectionKey>('procedural');
  // Section and cursor at the moment Ctrl+K opened the search, to insert there or return there.
  const [searchAt, setSearchAt] = useState<{ key: SectionKey; start: number; end: number } | null>(null);

  // Reading mode (F2): same idea, the cursor is remembered and put back on leaving.
  const [reading, setReading] = useState<{ key: SectionKey; start: number; end: number } | null>(null);
  const readingRef = useRef(reading);
  readingRef.current = reading;
  const searchRef = useRef(searchAt);
  searchRef.current = searchAt;
  // Protest form dialog: same remembered cursor, put back on closing.
  const [formAt, setFormAt] = useState<{ key: SectionKey; start: number; end: number } | null>(null);
  const formRef = useRef(formAt);
  formRef.current = formAt;
  const [copied, setCopied] = useState<string | null>(null);
  const copiedTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const where = () => {
      const key = SECTION_KEYS.find((k) => sectionRefs.current[k]?.hasFocus()) ?? lastSection.current;
      return { key, ...(sectionRefs.current[key]?.selection() ?? { start: 0, end: 0 }) };
    };
    function leaveReading() {
      const r = readingRef.current;
      if (!r) return;
      sectionRefs.current[r.key]?.restore(r);
      setReading(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'F2') {
        e.preventDefault();
        if (searchRef.current || formRef.current) return;
        if (readingRef.current) leaveReading();
        else {
          const at = where();
          (document.activeElement as HTMLElement | null)?.blur();
          setReading(at);
        }
      } else if (e.key === 'Escape' && readingRef.current) {
        e.preventDefault();
        leaveReading();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (readingRef.current || formRef.current) return;
        setSearchAt((open) => open ?? where());
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function flashCopied(id: string) {
    setCopied(id);
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(null), 1500);
  }

  async function copy(id: string, text: string) {
    flashCopied((await copyText(text)) ? id : 'failed');
  }

  function closeSearch() {
    if (!searchAt) return;
    sectionRefs.current[searchAt.key]?.restore(searchAt);
    setSearchAt(null);
  }

  function openForm() {
    const key = SECTION_KEYS.find((k) => sectionRefs.current[k]?.hasFocus()) ?? lastSection.current;
    setFormAt({ key, ...(sectionRefs.current[key]?.selection() ?? { start: 0, end: 0 }) });
  }

  function closeForm() {
    if (!formAt) return;
    sectionRefs.current[formAt.key]?.restore(formAt);
    setFormAt(null);
  }

  function pickFromSearch(s: Suggestion) {
    if (!searchAt) return;
    sectionRefs.current[searchAt.key]?.insert(s, searchAt.end);
    setSearchAt(null);
  }

  // Names, boats and sail numbers of the case, for inline completion (RF-004).
  const terms = useMemo(() => {
    if (!data) return [];
    const all = [
      ...data.parties.flatMap((p) => [p.name, p.boat_name, p.sail_number]),
      ...data.witnesses.map((w) => w.name),
    ];
    return [...new Set(all.map((t) => t.trim()).filter((t) => t.length > 2))];
  }, [data]);

  if (loadError) {
    return (
      <main className="page">
        <a href="#/">← Cases</a>
        <p className="error">{loadError}</p>
      </main>
    );
  }
  if (!data || !sections) return <div className="center muted">Loading…</div>;

  return (
    <div className="doc">
      <Header c={data} status={status}>
        <button className="ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => copy('all', fullText(data, sections))}>
          {copied === 'all' ? 'Copied' : 'Copy all'}
        </button>
        <button
          className="ghost"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => downloadText(fileName(data), fullText(data, sections))}
        >
          Download .txt
        </button>
        <button className="ghost" onMouseDown={(e) => e.preventDefault()} onClick={openForm}>
          Protest form
        </button>
        {copied === 'failed' && <span className="error">Copy failed - select the text and copy by hand.</span>}
        <span className="muted">F2 reading · Ctrl+K search</span>
      </Header>
      {replacedCopy && (
        <p className="notice">
          Another tab saved first. The server text is shown; your previous text is kept as a copy.{' '}
          <button className="ghost" onClick={restoreCopy}>
            Restore my text
          </button>{' '}
          <button className="ghost" onClick={dismissCopy}>
            Dismiss
          </button>
        </p>
      )}
      <main className="doc-body">
        {SECTION_KEYS.map((key: SectionKey) => (
          <Section
            key={key}
            ref={(h) => {
              if (h) sectionRefs.current[key] = h;
              else delete sectionRefs.current[key];
            }}
            onFocusSection={() => (lastSection.current = key)}
            caseId={caseId}
            sectionKey={key}
            label={SECTION_LABEL[key]}
            value={sections[key]}
            terms={terms}
            onChange={(v) => edit(key, v)}
            copied={copied === key}
            onCopy={() => copy(key, sections[key].trim())}
          />
        ))}
      </main>
      {reading && <ReadingView c={data} sections={sections} />}
      {formAt && <ProtestFormDialog c={data} onApply={updateCase} onClose={closeForm} onAuthLost={onAuthLost} />}
      {searchAt && <SearchDialog caseId={caseId} onPick={pickFromSearch} onClose={closeSearch} />}
    </div>
  );
}
