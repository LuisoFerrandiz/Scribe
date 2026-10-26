import { useCallback, useEffect, useState } from 'react';
import { ApiError, AuthError, api } from '../api';
import type { PhraseFileError, PhraseReload, PhraseStatus } from '../types';

// The `{"errors": [...]}` body of a 422 reload, if that is what failed.
function reloadErrors(e: unknown): PhraseFileError[] | null {
  if (!(e instanceof ApiError) || e.status !== 422) return null;
  try {
    const parsed = JSON.parse(e.body) as { errors?: PhraseFileError[] };
    return Array.isArray(parsed.errors) ? parsed.errors : null;
  } catch {
    return null;
  }
}

const place = (e: PhraseFileError) => (e.line > 0 ? `${e.file}:${e.line}` : e.file);

// SPEC-006: the base phrases are the .md files in data/phrases/base. This shows what each file holds,
// whether the database differs, and reloads the database from them (all or nothing). It never touches
// the open case or its drafts.
export function PhrasesDialog({ onClose, onAuthLost }: { onClose: () => void; onAuthLost: () => void }) {
  const [status, setStatus] = useState<PhraseStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<PhraseReload | null>(null);
  const [errors, setErrors] = useState<PhraseFileError[]>([]);
  const [problem, setProblem] = useState('');

  const fail = useCallback(
    (e: unknown) => {
      if (e instanceof AuthError) return onAuthLost();
      setProblem(e instanceof ApiError ? `The server answered ${e.status}.` : 'Could not reach the server.');
    },
    [onAuthLost],
  );

  const refresh = useCallback(() => api.phraseStatus().then(setStatus).catch(fail), [fail]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function reload() {
    setBusy(true);
    setProblem('');
    setErrors([]);
    setDone(null);
    try {
      setDone(await api.reloadPhrases());
    } catch (e) {
      const found = reloadErrors(e);
      if (found) setErrors(found);
      else fail(e);
    } finally {
      setBusy(false);
      void refresh();
    }
  }

  const shownErrors = errors.length > 0 ? errors : (status?.errors ?? []);

  return (
    <div
      className="search-overlay"
      onMouseDown={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div className="search-box form-box" role="dialog" aria-label="Phrases" onMouseDown={(e) => e.stopPropagation()}>
        <h2>Phrases</h2>
        <p className="muted">
          The phrases come from the .md files in <code>data/phrases/base</code>. Edit them, then reload.
        </p>
        {status && (
          <ul className="phrase-files">
            {status.files.map((f) => (
              <li key={f.file}>
                <span>{f.file}</span>
                <span className="muted">{f.errors.length > 0 ? 'has errors' : `${f.count} phrases`}</span>
              </li>
            ))}
          </ul>
        )}
        {status && status.errors.length === 0 && (
          <p className={status.differs ? '' : 'muted'}>
            {status.differs
              ? `The files differ from what is loaded: +${status.added}, −${status.removed}.`
              : `Loaded phrases match the files (${status.total}).`}
          </p>
        )}
        <div className="form-actions">
          <button onClick={() => void reload()} disabled={busy || !status}>
            {busy ? 'Reloading…' : 'Reload from files'}
          </button>
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
        {done && (
          <p role="status">
            {done.changed
              ? `Loaded ${done.total} phrases (+${done.added}, −${done.removed}).`
              : `Nothing to change: the ${done.total} loaded phrases already match the files.`}
          </p>
        )}
        {shownErrors.length > 0 && (
          <div className="error" role="alert">
            <p>Nothing was changed. Fix these and reload:</p>
            <ul>
              {shownErrors.map((e, i) => (
                <li key={i}>
                  <strong>{place(e)}</strong> — {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        {problem && <p className="error">{problem}</p>}
      </div>
    </div>
  );
}
