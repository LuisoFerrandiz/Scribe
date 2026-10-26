import { useCallback, useEffect, useState } from 'react';
import { AuthError, api, serverError } from '../api';
import type { DocType, EventRow, ResourceDetail, ResourceRow } from '../types';
import { ConfirmButton } from './ConfirmButton';

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: 'nor', label: 'Notice of Race (NoR)' },
  { value: 'si', label: 'Sailing Instructions (SI)' },
  { value: 'class', label: 'Class rules' },
  { value: 'nor_amendment', label: 'NoR amendment' },
  { value: 'si_amendment', label: 'SI amendment' },
  { value: 'class_amendment', label: 'Class rules amendment' },
];
const TYPE_LABEL = Object.fromEntries(DOC_TYPES.map((t) => [t.value, t.label])) as Record<string, string>;

// The documents of one event that the search looks into (Ctrl+K, "Event documents"). A file is
// converted on upload, shown with the rules found in it, and only searchable and citable once accepted.
export function Documents({ onAuthLost }: { onAuthLost: () => void }) {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [eventId, setEventId] = useState<number | null>(null);
  const [docs, setDocs] = useState<ResourceRow[]>([]);
  const [details, setDetails] = useState<Record<number, ResourceDetail>>({});
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<DocType>('nor');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fail = useCallback(
    (e: unknown) => (e instanceof AuthError ? onAuthLost() : setError(serverError(e))),
    [onAuthLost],
  );

  const load = useCallback(async () => {
    try {
      const rules = await api.listRules();
      setDocs(rules.filter((r) => r.layer === 'event'));
    } catch (e) {
      fail(e);
    }
  }, [fail]);

  useEffect(() => {
    api
      .listEvents()
      .then((list) => {
        setEvents(list);
        if (list.length > 0) setEventId(list[0].id);
      })
      .catch(fail);
    void load();
  }, [fail, load]);

  const shown = docs.filter((d) => d.event_id === eventId);

  // What the parser found in each document waiting for review.
  useEffect(() => {
    for (const d of shown) {
      if (d.status === 'pending_review' && !details[d.id]) {
        api
          .getResource(d.id)
          .then((r) => setDetails((m) => ({ ...m, [d.id]: r })))
          .catch(fail);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, eventId]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || eventId === null) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('kind', 'rule');
      form.append('layer', 'event');
      form.append('event_id', String(eventId));
      form.append('doc_type', docType);
      form.append('title', title.trim() || file.name);
      form.append('file', file);
      await api.uploadResource(form);
      setFile(null);
      setTitle('');
      (e.target as HTMLFormElement).reset();
      await load();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function act(run: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await run();
      await load();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <header className="bar">
        <a href="#/">← Cases</a>
        <h1>Event documents</h1>
      </header>
      <p className="muted">
        NoR, Sailing Instructions and class rules of an event. Once accepted, Ctrl+K finds them and inserts their
        rule numbers (NoR 4.1, SI 12, CR 3.2).
      </p>

      {events?.length === 0 && <p className="muted">There is no event yet. Create one with a new case first.</p>}
      {events && events.length > 0 && (
        <>
          <label className="field-row">
            Event
            <select value={eventId ?? ''} onChange={(e) => setEventId(Number(e.target.value))}>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </label>

          <form className="doc-upload" onSubmit={upload}>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.md,.txt"
              aria-label="Document file"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''));
              }}
            />
            <select value={docType} onChange={(e) => setDocType(e.target.value as DocType)} aria-label="Document type">
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
            <button type="submit" disabled={busy || !file}>
              {busy ? 'Working…' : 'Upload'}
            </button>
          </form>
        </>
      )}

      {error && <p className="error">{error}</p>}

      <ul className="doc-list">
        {shown.map((d) => {
          const preview = details[d.id]?.sectionsPreview;
          return (
            <li key={d.id}>
              <div className="doc-line">
                <strong>{d.title}</strong>
                <span className="muted">{d.doc_type ? TYPE_LABEL[d.doc_type] : ''}</span>
                <span className={`badge ${d.status}`}>{d.status === 'accepted' ? 'Searchable' : 'Waiting for your review'}</span>
                <span className="spacer" />
                {d.status === 'pending_review' ? (
                  <>
                    <button disabled={busy || d.conversion_empty === 1} onClick={() => void act(() => api.acceptResource(d.id))}>
                      Accept
                    </button>
                    <ConfirmButton
                      label="Reject"
                      question="Discard this file?"
                      confirmLabel="Discard"
                      disabled={busy}
                      onConfirm={() => void act(() => api.rejectResource(d.id))}
                    />
                  </>
                ) : (
                  <ConfirmButton
                    label="Delete"
                    question="Delete it from the search?"
                    confirmLabel="Delete"
                    disabled={busy}
                    onConfirm={() => void act(() => api.deleteResource(d.id))}
                  />
                )}
              </div>
              {d.conversion_empty === 1 && (
                <p className="error">No text could be read from this file (a scan?). It cannot be searched.</p>
              )}
              {d.status === 'pending_review' && preview && d.conversion_empty === 0 && (
                <p className="muted">
                  {preview.count === 0
                    ? 'No numbered rules were found in it. Accepting makes it searchable as plain text only.'
                    : `${preview.count} rules found, for example ${preview.sample.join(', ')}.`}
                </p>
              )}
            </li>
          );
        })}
        {events && events.length > 0 && shown.length === 0 && <li className="muted">No documents for this event yet.</li>}
      </ul>
    </main>
  );
}
