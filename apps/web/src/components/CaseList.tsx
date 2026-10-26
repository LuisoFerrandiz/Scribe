import { useEffect, useState } from 'react';
import { AuthError, api, serverError } from '../api';
import { go } from '../App';
import { raceLabel } from '../docFormat';
import { clearCaseLocal } from '../draftStore';
import { ConfirmButton } from './ConfirmButton';
import type { CaseSummary, SessionUser } from '../types';

const KIND_LABEL: Record<string, string> = { protest: 'Protest', redress: 'Redress', reopening: 'Reopening' };

export function CaseList({
  user,
  onAuthLost,
  onLogout,
}: {
  user: SessionUser;
  onAuthLost: () => void;
  onLogout: () => void;
}) {
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listCases()
      .then(setCases)
      .catch((e) => (e instanceof AuthError ? onAuthLost() : setError(serverError(e))));
  }, [onAuthLost]);

  async function remove(id: number) {
    setError('');
    try {
      await api.deleteCase(id);
      clearCaseLocal(id);
      setCases((list) => list?.filter((c) => c.id !== id) ?? null);
    } catch (e) {
      if (e instanceof AuthError) onAuthLost();
      else setError(serverError(e));
    }
  }

  return (
    <main className="page">
      <header className="bar">
        <h1>Cases</h1>
        <span className="spacer" />
        <button className="ghost" onClick={() => go('#/documents')}>
          Event documents
        </button>
        <button onClick={() => go('#/new')}>New case</button>
        <button className="ghost" onClick={onLogout} title={user.username}>
          Sign out
        </button>
      </header>
      {error && <p className="error">{error}</p>}
      {cases === null && !error && <p className="muted">Loading…</p>}
      {cases?.length === 0 && <p className="muted">No cases yet.</p>}
      {cases && cases.length > 0 && (
        <div className="cases-head" aria-hidden="true">
          <span>Case</span>
          <span>Race</span>
          <span>Event</span>
          <span>Type</span>
          <span>Hearing</span>
        </div>
      )}
      <ul className="cases">
        {cases?.map((c) => (
          <li key={c.id}>
            <a href={`#/case/${c.id}`}>
              <strong>{c.case_number}</strong>
              <span>{raceLabel(c.race ?? '')}</span>
              <span>{c.event_name}</span>
              <span className="muted">{c.kinds.split(',').map((k) => KIND_LABEL[k] ?? k).join(' + ')}</span>
              <span className="muted">{c.hearing_at ? c.hearing_at.replace('T', ' ') : ''}</span>
            </a>
            <ConfirmButton
              label="Delete"
              question={`Delete case ${c.case_number} and its text?`}
              confirmLabel="Delete case"
              onConfirm={() => void remove(c.id)}
            />
          </li>
        ))}
      </ul>
    </main>
  );
}
