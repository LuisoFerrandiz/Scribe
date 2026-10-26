import { useEffect, useState } from 'react';
import { AuthError, api, serverError } from '../api';
import { go } from '../App';
import type { EventRow, Kind } from '../types';
import { PartiesEditor, WitnessesEditor, emptyParty, type PartyDraft, type WitnessDraft } from './PeopleEditor';

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: 'protest', label: 'Protest' },
  { value: 'redress', label: 'Redress' },
  { value: 'reopening', label: 'Reopening' },
];
function nowLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function NewCase({ onAuthLost }: { onAuthLost: () => void }) {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [eventId, setEventId] = useState<number | 'new'>('new');
  const [eventName, setEventName] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [caseNumber, setCaseNumber] = useState('');
  const [kinds, setKinds] = useState<Kind[]>(['protest']);
  const [hearingAt, setHearingAt] = useState(nowLocal);
  const [parties, setParties] = useState<PartyDraft[]>([emptyParty('protestor'), emptyParty('respondent')]);
  // The usual case (about 80%): one protestor, one respondent, two witnesses. Empty witness rows are not saved.
  const [witnesses, setWitnesses] = useState<WitnessDraft[]>([
    { name: '', supports: null },
    { name: '', supports: null },
  ]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .listEvents()
      .then((list) => {
        setEvents(list);
        if (list.length > 0) setEventId(list[0].id);
      })
      .catch((e) => (e instanceof AuthError ? onAuthLost() : setError(serverError(e))));
  }, [onAuthLost]);

  const toggleKind = (k: Kind) =>
    setKinds((list) => (list.includes(k) ? list.filter((x) => x !== k) : [...list, k]));

  const needsEvent = eventId === 'new';
  const canSave =
    !busy && caseNumber.trim() !== '' && kinds.length > 0 && (!needsEvent || eventName.trim() !== '');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const event_id = needsEvent
        ? (await api.createEvent({ name: eventName.trim(), timezone: timezone.trim() || 'UTC' })).id
        : eventId;
      const created = await api.createCase({
        event_id,
        case_number: caseNumber.trim(),
        kinds,
        hearing_at: hearingAt || null,
        parties,
      });
      const named = witnesses.filter((w) => w.name.trim() !== '');
      if (named.length > 0) {
        await api.setWitnesses(
          created.id,
          named.map((w) => ({
            name: w.name.trim(),
            supports_party_id: w.supports === null ? null : (created.parties[w.supports]?.id ?? null),
          })),
        );
      }
      go(`#/case/${created.id}`);
    } catch (err) {
      if (err instanceof AuthError) onAuthLost();
      else setError(serverError(err));
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <header className="bar">
        <a href="#/">← Cases</a>
        <h1>New case</h1>
      </header>
      <form className="newcase" onSubmit={submit}>
        <fieldset>
          <legend>Event</legend>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value === 'new' ? 'new' : Number(e.target.value))}
            disabled={events === null}
          >
            {events?.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
            <option value="new">+ New event</option>
          </select>
          {needsEvent && (
            <div className="row">
              <input placeholder="Event name" value={eventName} onChange={(e) => setEventName(e.target.value)} />
              <input placeholder="Time zone" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>Case</legend>
          <div className="row">
            <input
              autoFocus
              placeholder="Case number"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
            />
            <input type="datetime-local" value={hearingAt} onChange={(e) => setHearingAt(e.target.value)} />
          </div>
          <div className="row">
            {KIND_OPTIONS.map((k) => (
              <label key={k.value} className="check">
                <input type="checkbox" checked={kinds.includes(k.value)} onChange={() => toggleKind(k.value)} />
                {k.label}
              </label>
            ))}
          </div>
        </fieldset>

        <PartiesEditor parties={parties} setParties={setParties} setWitnesses={setWitnesses} />
        <WitnessesEditor parties={parties} witnesses={witnesses} setWitnesses={setWitnesses} />

        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={!canSave}>
          Create and open
        </button>
      </form>
    </main>
  );
}
