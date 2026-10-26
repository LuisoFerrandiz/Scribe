import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, AuthError, api, serverError } from './api';
import { clearCopy, readCachedCase, readCopy, readDraft, writeCachedCase, writeCopy, writeDraft } from './draftStore';
import { SECTION_KEYS, type CaseFull, type SectionKey, type Sections } from './types';

export type SaveStatus = 'saved' | 'saving' | 'offline' | 'failed';

const SAVE_DELAY_MS = 1000;
const RETRY_DELAY_MS = 5000;

const sectionsOf = (c: Pick<CaseFull, SectionKey>): Sections => ({
  procedural: c.procedural,
  facts: c.facts,
  conclusion: c.conclusion,
  rules_text: c.rules_text,
  decision: c.decision,
});

const sameSections = (a: Sections, b: Sections) => SECTION_KEYS.every((k) => a[k] === b[k]);

// One case document: loads it, keeps the text, saves it (debounced) and mirrors it to a local draft.
export function useCaseDoc(caseId: number, onAuthLost: () => void) {
  const [data, setData] = useState<CaseFull | null>(null);
  const [sections, setSections] = useState<Sections | null>(null);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [loadError, setLoadError] = useState('');
  // Text that another tab's save replaced; offered back once (RF-012).
  const [replacedCopy, setReplacedCopy] = useState<Sections | null>(null);

  const text = useRef<Sections | null>(null);
  const stamp = useRef(''); // server updated_at the next save is based on
  const edits = useRef(0); // counts edits, to tell whether text changed during a save
  const saving = useRef(false);
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const alive = useRef(true);

  const schedule = useCallback((delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (saving.current || !text.current || !dirty.current) return;
    saving.current = true;
    setStatus('saving');
    const sent = text.current;
    const sentEdits = edits.current;
    try {
      const result = await api.saveDoc(caseId, stamp.current, sent);
      stamp.current = result.updated_at;
      const unchanged = edits.current === sentEdits;
      dirty.current = !unchanged;
      writeDraft(caseId, { sections: text.current, base: stamp.current, dirty: dirty.current });
      if (!alive.current) return;
      if (unchanged) setStatus('saved');
      else schedule(SAVE_DELAY_MS);
    } catch (e) {
      if (e instanceof AuthError) {
        onAuthLost();
      } else if (e instanceof ApiError && e.status === 409) {
        takeServerText(JSON.parse(e.body) as CaseFull);
      } else {
        // Network down (TypeError from fetch) or a server error: the draft keeps the text; retry.
        if (alive.current) setStatus(e instanceof ApiError ? 'failed' : 'offline');
        schedule(RETRY_DELAY_MS);
      }
    } finally {
      saving.current = false;
    }
  }

  // Another tab saved first: show the server text, keep ours as a copy, tell the user once.
  function takeServerText(server: CaseFull) {
    const mine = text.current!;
    const theirs = sectionsOf(server);
    stamp.current = server.updated_at;
    edits.current++;
    dirty.current = false;
    text.current = theirs;
    writeDraft(caseId, { sections: theirs, base: stamp.current, dirty: false });
    if (!sameSections(mine, theirs)) {
      writeCopy(caseId, mine);
      if (alive.current) setReplacedCopy(mine);
    }
    if (alive.current) {
      setSections(theirs);
      setStatus('saved');
    }
  }

  useEffect(() => {
    alive.current = true;
    let cancelled = false;

    function start(c: CaseFull, offline: boolean) {
      const server = sectionsOf(c);
      const draft = readDraft(caseId);
      let initial = server;
      stamp.current = c.updated_at;
      dirty.current = false;

      if (draft?.dirty && !sameSections(draft.sections, server)) {
        if (draft.base === c.updated_at || offline) {
          // The local text is newer than the server: it wins and is saved.
          initial = draft.sections;
          stamp.current = offline ? draft.base : c.updated_at;
          dirty.current = true;
        } else {
          // The server moved on since this draft was written: keep the draft as a copy.
          writeCopy(caseId, draft.sections);
          setReplacedCopy(draft.sections);
        }
      }
      text.current = initial;
      setData(c);
      setSections(initial);
      writeDraft(caseId, { sections: initial, base: stamp.current, dirty: dirty.current });
      if (dirty.current) {
        setStatus(offline ? 'offline' : 'saving');
        schedule(offline ? RETRY_DELAY_MS : 0);
      }
    }

    api
      .getCase(caseId)
      .then((c) => {
        if (cancelled) return;
        writeCachedCase(c);
        start(c, false);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof AuthError) return onAuthLost();
        const cached = readCachedCase(caseId);
        if (cached && !(e instanceof ApiError)) start(cached, true);
        else setLoadError(serverError(e));
      });

    const onOnline = () => {
      if (dirty.current) schedule(0);
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden' && dirty.current) schedule(0);
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      cancelled = true;
      alive.current = false;
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onHide);
      window.clearTimeout(timer.current);
      if (dirty.current) void save(); // leaving the case: send what is pending
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const edit = useCallback(
    (key: SectionKey, value: string) => {
      if (!text.current) return;
      text.current = { ...text.current, [key]: value };
      edits.current++;
      dirty.current = true;
      setSections(text.current);
      // Written before the server sees it: this is what survives a closed tab or a dead network.
      writeDraft(caseId, { sections: text.current, base: stamp.current, dirty: true });
      schedule(SAVE_DELAY_MS);
    },
    [caseId, schedule],
  );

  const restoreCopy = useCallback(() => {
    const copy = replacedCopy ?? readCopy(caseId);
    if (!copy) return;
    text.current = copy;
    edits.current++;
    dirty.current = true;
    setSections(copy);
    writeDraft(caseId, { sections: copy, base: stamp.current, dirty: true });
    clearCopy(caseId);
    setReplacedCopy(null);
    schedule(0);
  }, [caseId, replacedCopy, schedule]);

  const dismissCopy = useCallback(() => setReplacedCopy(null), []);

  // Case data changed outside the document (accepted protest form): only these fields are merged,
  // so the text and its save stamp are never touched.
  const updateCase = useCallback(
    (patch: Pick<Partial<CaseFull>, 'case_number' | 'kinds' | 'hearing_at' | 'parties' | 'witnesses'>) =>
      setData((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        writeCachedCase(next);
        return next;
      }),
    [],
  );

  return { data, sections, status, loadError, replacedCopy, edit, restoreCopy, dismissCopy, updateCase };
}
