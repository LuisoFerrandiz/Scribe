import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { copyText, fullText, raceLabel } from '../docFormat';
import { readRailCollapsed, writeRailCollapsed } from '../draftStore';
import { ReadingView } from './ReadingView';
import { CaseDataPanel } from './CaseDataPanel';
import { ProtestFormDialog } from './ProtestFormDialog';
import { SearchDialog } from './SearchDialog';
import { matchData } from '../dataMatch';
import { offersFor, type FillCase } from '../fillData';
import { blockAfterEdit, findMarks, nextMark, replaceMark, type Block } from '../fillMarks';
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
const partyText = (p: PartyRow) =>
  `${ROLE_LABEL[p.role]}: ${[p.name, p.boat_name, p.sail_number].filter(Boolean).join(', ') || '—'}`;

// The case, kept beside the document: where the scribe is, whether it is saved, who is involved, and
// the few things to do besides writing. Parties scroll inside the rail, so many parties never push
// the document down.
function CaseRail({
  c,
  status,
  collapsed,
  onToggle,
  onSearch,
  onReading,
  children,
}: {
  c: CaseFull;
  status: SaveStatus;
  collapsed: boolean;
  onToggle: () => void;
  onSearch: () => void;
  onReading: () => void;
  children?: ReactNode;
}) {
  const kinds = c.kinds.split(',').map((k) => KIND_LABEL[k] ?? k).join(' + ');
  // The save state is the one thing that never hides: folded, it stays as a coloured dot.
  if (collapsed) {
    return (
      <aside className="rail collapsed">
        <button
          className="rail-toggle"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggle}
          aria-label="Show case panel"
          aria-expanded={false}
          title="Show case panel"
        >
          »
        </button>
        <button className="rail-icon" onMouseDown={(e) => e.preventDefault()} onClick={onSearch} aria-label="Search" title="Search (Ctrl+K)">
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M12.8 12.8 18 18" />
          </svg>
        </button>
        <button className="rail-icon" onMouseDown={(e) => e.preventDefault()} onClick={onReading} aria-label="Reading" title="Reading (F2)">
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 4h5.5a1.5 1.5 0 0 1 1.5 1.5V17a1.5 1.5 0 0 0-1.5-1.5H3z" />
            <path d="M17 4h-5.5A1.5 1.5 0 0 0 10 5.5V17a1.5 1.5 0 0 1 1.5-1.5H17z" />
          </svg>
        </button>
        {/* A fault changes the shape (an exclamation mark), not only the colour. */}
        <span className={`status status-${status}`} role="status" aria-label={STATUS_LABEL[status]} title={STATUS_LABEL[status]}>
          {status === 'offline' || status === 'failed' ? <span className="bang" aria-hidden="true">!</span> : <span className="dot" aria-hidden="true" />}
        </span>
        <span className="rail-case">Case {c.case_number}</span>
      </aside>
    );
  }
  return (
    <aside className="rail">
      <div className="rail-top">
        <a href="#/" className="rail-back">
          ← Cases
        </a>
        <button
          className="rail-toggle"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggle}
          aria-label="Hide case panel"
          aria-expanded={true}
          title="Hide case panel"
        >
          «
        </button>
      </div>
      <h1>Case {c.case_number}</h1>
      <p className="rail-meta">
        {c.event_name}
        <br />
        {raceLabel(c.race ?? '') && (
          <>
            <strong>{raceLabel(c.race ?? '')}</strong>
            <br />
          </>
        )}
        {kinds}
        {c.hearing_at ? `, ${c.hearing_at.replace('T', ' ')}` : ''}
      </p>
      <p className={`status status-${status}`} role="status">
        <span className="dot" aria-hidden="true" />
        {STATUS_LABEL[status]}
      </p>
      <div className="rail-people">
        <h2>Parties ({c.parties.length})</h2>
        <ul>
          {c.parties.map((p) => (
            <li key={p.id}>{partyText(p)}</li>
          ))}
        </ul>
        {c.witnesses.length > 0 && (
          <>
            <h2>Witnesses ({c.witnesses.length})</h2>
            <ul>
              {c.witnesses.map((w) => (
                <li key={w.id}>{w.name || '—'}</li>
              ))}
            </ul>
          </>
        )}
      </div>
      <nav className="rail-tools">{children}</nav>
    </aside>
  );
}

// A rail action. The mouse down is cancelled so a click never takes the cursor out of the text.
function Tool({ label, hint, onClick }: { label: string; hint?: string; onClick: () => void }) {
  return (
    <button className="tool" onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      <span>{label}</span>
      {hint && <kbd>{hint}</kbd>}
    </button>
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
  fillCase: FillCase | null;
  onChange: (v: string) => void;
  onFocusSection: () => void;
  copied: boolean;
  onCopy: () => void;
}

const Section = forwardRef<SectionHandle, SectionProps>(function Section(
  { caseId, sectionKey, label, value, terms, fillCase, onChange, onFocusSection, copied, onCopy },
  handleRef,
) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState(0);
  // Where Esc dismissed a suggestion; typing anything changes the length and brings it back.
  const [dismissed, setDismissed] = useState<{ caret: number; length: number } | null>(null);
  const pendingCaret = useRef<number | null>(null);
  // SPEC-007: the block of a phrase just inserted whose marks are being filled in, and what to select once the text changes.
  const [fill, setFill] = useState<Block | null>(null);
  const [selEnd, setSelEnd] = useState(0);
  const pendingSel = useRef<{ start: number; end: number } | null>(null);
  const composing = useRef(false);
  const [focused, setFocused] = useState(false);

  // Grows with the text so the page scrolls, never the box.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    if (pendingSel.current) {
      const { start, end } = pendingSel.current;
      el.setSelectionRange(start, end);
      setCaret(start);
      setSelEnd(end);
      pendingSel.current = null;
    } else if (pendingCaret.current !== null) {
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  }, [value]);

  // A change that did not come through the keys below (a restored section, another tab) leaves the block stale.
  useEffect(() => {
    if (fill && fill.end > value.length) setFill(null);
  }, [fill, value]);

  // RF-002: a phrase with marks starts the fill-in on the text it brought, with the first mark selected.
  function openFill(text: string, start: number, end: number) {
    const first = findMarks(text, start, end)[0];
    if (!first) return setFill(null);
    setFill({ start, end });
    pendingSel.current = { start: first.start, end: first.end };
  }

  // The mark under the selection, the offers for it and the marks left in the block.
  const marksLeft = fill ? findMarks(value, fill.start, fill.end) : [];
  const current = fill ? marksLeft.find((m) => m.start === caret && m.end === selEnd) : undefined;
  const offers = current && fillCase ? offersFor(current, fillCase) : [];

  function finishFill(at: Block) {
    ref.current?.setSelectionRange(at.end, at.end);
    setCaret(at.end);
    setSelEnd(at.end);
    setFill(null);
  }

  // Writes `text` in place of the selected mark and moves to the next one; with none left the block is done.
  function resolveCurrent(text: string) {
    if (!fill || !current) return;
    const nextText = replaceMark(value, current, text);
    const block = { start: fill.start, end: fill.end + text.length - (current.end - current.start) };
    const next = nextMark(nextText, block, current.start);
    onChange(nextText);
    if (next) {
      setFill(block);
      pendingSel.current = { start: next.start, end: next.end };
    } else {
      setFill(null);
      pendingSel.current = { start: block.end, end: block.end };
    }
  }

  // Tab: accept the one offer a datum has; otherwise leave this mark as it is and go to the next.
  function advance() {
    if (!fill) return;
    if (current?.kind === 'hole' && offers.length === 1) return resolveCurrent(offers[0].text);
    const next = nextMark(value, fill, selEnd);
    if (!next) return finishFill(fill);
    ref.current?.setSelectionRange(next.start, next.end);
    setCaret(next.start);
    setSelEnd(next.end);
  }

  // RF-004: only at the end of a word, so the grey text never sits over typed text.
  const ghost = useMemo(() => {
    if (composing.current || (dismissed && dismissed.caret === caret && dismissed.length === value.length)) {
      return null;
    }
    const next = value[caret];
    if (next !== undefined && !/\s/.test(next)) return null;
    return matchData(value.slice(0, caret), terms);
  }, [value, caret, terms, dismissed]);

  const [suggestion, clearSuggestion] = useSuggestion(caseId, sectionKey, value, caret, focused && !ghost && !fill);

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
        setSelEnd(next.caret);
        clearSuggestion();
        if (s.kind === 'phrase') openFill(next.value, next.caret - suggestionText(s).length, next.caret);
        else setFill(null);
        ref.current?.focus();
      },
    }),
    [value, onChange, clearSuggestion],
  );

  // Tab and Esc act only on something visible: the grey completion first, then the suggestion
  // line. With neither visible they keep their normal meaning.
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return;
    if (fill && !ghost) {
      // Alt alone: AltGr arrives as Ctrl+Alt on a Spanish keyboard and types symbols.
      const digit = /^Digit([1-9])$/.exec(e.code);
      if (digit && e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const offer = offers[Number(digit[1]) - 1];
        if (offer) resolveCurrent(offer.text);
        return;
      }
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        return advance();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        return setFill(null);
      }
    }
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
        setSelEnd(next.caret);
        clearSuggestion();
        if (suggestion.kind === 'phrase') openFill(next.value, next.caret - suggestionText(suggestion).length, next.caret);
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
      <div className="section-body">
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
            setSelEnd(e.target.selectionEnd);
            if (fill) {
              const block = blockAfterEdit(value, e.target.value, fill);
              setFill(block && findMarks(e.target.value, block.start, block.end).length > 0 ? block : null);
            }
            onChange(e.target.value);
          }}
          onSelect={(e) => {
            const { selectionStart: a, selectionEnd: b } = e.currentTarget;
            setCaret(a);
            setSelEnd(b);
            if (fill && (a < fill.start || b > fill.end)) setFill(null);
          }}
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
          onBlur={() => {
            setFocused(false);
            setFill(null);
          }}
          lang="en"
          spellCheck
          rows={3}
          aria-label={label}
        />
      </div>
      {/* Fixed height so a suggestion appearing never moves the text being written. */}
      <div className="suggest-line" aria-live="off">
        {focused && fill && (
          <>
            <span className="tag">Fill</span>
            <span className="text">{fillLine(current?.kind, offers)}</span>
            <span className="hint">Tab</span>
          </>
        )}
        {focused && !fill && suggestion && (
          <>
            <span className="tag">{suggestion.kind === 'phrase' ? 'Phrase' : 'Rule'}</span>
            <span className="text">{suggestionText(suggestion)}</span>
            {suggestion.kind === 'rule' && <span className="muted">{suggestion.heading}</span>}
            <span className="hint">Tab</span>
          </>
        )}
      </div>
      </div>
    </section>
  );
});

// The line under the box while marks are being filled in: what the keys do for the mark that is selected.
const OPTION_CHARS = 28;
function fillLine(kind: 'choice' | 'hole' | undefined, offers: { label: string }[]): string {
  const short = (t: string) => (t.length > OPTION_CHARS ? `${t.slice(0, OPTION_CHARS - 1)}…` : t);
  if (kind === 'hole' && offers.length === 1) return `Tab writes ${short(offers[0].label)}  ·  Esc stop`;
  if (offers.length > 0) return `${offers.map((o, i) => `Alt+${i + 1} ${short(o.label)}`).join('   ')}  ·  Tab skip  ·  Esc stop`;
  if (kind === 'hole') return 'Type the value  ·  Tab skip  ·  Esc stop';
  return 'Tab next mark  ·  Esc stop';
}

// The start of a section's text, for the conflict notice.
const preview = (t: string) => (t.trim().length > 70 ? `${t.trim().slice(0, 70)}…` : t.trim() || '(empty)');

export function CaseView({ caseId, onAuthLost }: { caseId: number; onAuthLost: () => void }) {
  const { data, sections, status, loadError, conflict, edit, restoreMine, dismissConflict, updateCase } = useCaseDoc(
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
  // Case panel folded or not (SPEC-003), remembered on this browser.
  const [railCollapsed, setRailCollapsed] = useState(readRailCollapsed);
  function toggleRail() {
    setRailCollapsed((v) => {
      writeRailCollapsed(!v);
      return !v;
    });
  }

  // Case data panel (SPEC-002 A-3): beside the document, not over it.
  const [panelOpen, setPanelOpen] = useState(false);
  const panelAt = useRef<{ key: SectionKey; start: number; end: number } | null>(null);
  const [dataDirty, setDataDirty] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const copiedTimer = useRef<number | undefined>(undefined);

  // Section and selection where the cursor is (or was last), to give it back after a dialog or reading.
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
  function toggleReading() {
    if (searchRef.current || formRef.current) return;
    if (readingRef.current) leaveReading();
    else {
      const at = where();
      (document.activeElement as HTMLElement | null)?.blur();
      setReading(at);
    }
  }
  function openSearch() {
    if (readingRef.current || formRef.current) return;
    setSearchAt((open) => open ?? where());
  }

  // The keys and the header buttons do the same thing. These handlers only use refs and state
  // setters, so the copy registered once here stays correct.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'F2') {
        e.preventDefault();
        toggleReading();
      } else if (e.key === 'Escape' && readingRef.current) {
        e.preventDefault();
        leaveReading();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setFormAt(where());
  }

  function openPanel() {
    panelAt.current = where();
    setPanelOpen(true);
  }

  function closePanel() {
    const at = panelAt.current;
    setPanelOpen(false);
    if (at) sectionRefs.current[at.key]?.restore(at);
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

  // What the case knows, for the data marks of a phrase (SPEC-007).
  const fillCase = useMemo<FillCase | null>(
    () =>
      data ? { case_number: data.case_number, race: data.race ?? '', hearing_at: data.hearing_at, parties: data.parties } : null,
    [data],
  );

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
    <div className={`doc${panelOpen ? ' with-panel' : ''}${railCollapsed ? ' rail-collapsed' : ''}`}>
      <CaseRail c={data} status={status} collapsed={railCollapsed}
        onToggle={toggleRail}
        onSearch={openSearch}
        onReading={toggleReading}
      >
        <Tool label="Search" hint="Ctrl+K" onClick={openSearch} />
        <Tool label="Reading" hint="F2" onClick={toggleReading} />
        <Tool label={`Case data${dataDirty ? ' •' : ''}`} onClick={panelOpen ? closePanel : openPanel} />
        <Tool label="Protest form" onClick={openForm} />
        <Tool label={copied === 'all' ? 'Copied' : 'Copy all'} onClick={() => copy('all', fullText(data, sections))} />
        {copied === 'failed' && <p className="error">Copy failed. Select the text and copy it by hand.</p>}
      </CaseRail>
      <div className="doc-main">
      {conflict && (
        <div className="notice" role="alert">
          <p>
            Another tab saved first, so its text is shown. Your edits to {conflict.keys.length === 1 ? 'this section were' : 'these sections were'}{' '}
            not kept:
          </p>
          <ul>
            {conflict.keys.map((k) => (
              <li key={k}>
                <strong>{SECTION_LABEL[k]}</strong>
                <span className="muted"> {preview(conflict.mine[k])}</span>
                <button className="ghost" onClick={() => restoreMine(k)}>
                  Restore mine
                </button>
              </li>
            ))}
          </ul>
          <button className="ghost" onClick={dismissConflict}>
            Keep the server text
          </button>
        </div>
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
            fillCase={fillCase}
            onChange={(v) => edit(key, v)}
            copied={copied === key}
            onCopy={() => copy(key, sections[key].trim())}
          />
        ))}
      </main>
      </div>
      <CaseDataPanel
        c={data}
        open={panelOpen}
        onApply={updateCase}
        onClose={closePanel}
        onDirtyChange={setDataDirty}
        onAuthLost={onAuthLost}
      />
      {reading && <ReadingView sections={sections} />}
      {formAt && <ProtestFormDialog c={data} onApply={updateCase} onClose={closeForm} onAuthLost={onAuthLost} />}
      {searchAt && <SearchDialog caseId={caseId} onPick={pickFromSearch} onClose={closeSearch} />}
    </div>
  );
}
