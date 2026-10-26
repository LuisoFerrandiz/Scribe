import { useEffect, useState } from 'react';
import { AuthError, api, serverError } from '../api';
import { go } from '../App';
import type { EventRow, Kind, Role } from '../types';

interface PartyDraft {
  role: Role;
  name: string;
  boat_name: string;
  sail_number: string;
}
interface WitnessDraft {
  name: string;
  supports: number | null; // index in the party list
}

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: 'protest', label: 'Protest' },
  { value: 'redress', label: 'Redress' },
  { value: 'reopening', label: 'Reopening' },
];
const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'protestor', label: 'Protestor' },
  { value: 'respondent', label: 'Respondent' },
  { value: 'other', label: 'Other' },
];

const emptyParty = (role: Role): PartyDraft => ({ role, name: '', boat_name: '', sail_number: '' });

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
  const [witnesses, setWitnesses] = useState<WitnessDraft[]>([]);
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

  const patchParty = (i: number, patch: Partial<PartyDraft>) =>
    setParties((list) => list.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const patchWitness = (i: number, patch: Partial<WitnessDraft>) =>
    setWitnesses((list) => list.map((w, j) => (j === i ? { ...w, ...patch } : w)));

  function removeParty(i: number) {
    setParties((list) => list.filter((_, j) => j !== i));
    // Witnesses pointing at the removed party lose it; later indexes shift down.
    setWitnesses((list) =>
      list.map((w) => ({
        ...w,
        supports: w.supports === null || w.supports === i ? null : w.supports > i ? w.supports - 1 : w.supports,
      })),
    );
  }

  const toggleKind = (k: Kind) =>
    setKinds((list) => (list.includes(k) ? list.filter((x) => x !== k) : [...list, k]));

  const partyLabel = (p: PartyDraft, i: number) => p.name || p.sail_number || p.boat_name || `Party ${i + 1}`;
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

        <fieldset>
          <legend>Parties ({parties.length})</legend>
          {parties.map((p, i) => (
            <div className="row" key={i}>
              <select value={p.role} onChange={(e) => patchParty(i, { role: e.target.value as Role })}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <input placeholder="Name" value={p.name} onChange={(e) => patchParty(i, { name: e.target.value })} />
              <input
                placeholder="Boat"
                value={p.boat_name}
                onChange={(e) => patchParty(i, { boat_name: e.target.value })}
              />
              <input
                placeholder="Sail no."
                value={p.sail_number}
                onChange={(e) => patchParty(i, { sail_number: e.target.value })}
              />
              <button type="button" className="ghost" onClick={() => removeParty(i)} aria-label="Remove party">
                ×
              </button>
            </div>
          ))}
          <button type="button" className="ghost" onClick={() => setParties((l) => [...l, emptyParty('other')])}>
            + Add party
          </button>
        </fieldset>

        <fieldset>
          <legend>Witnesses ({witnesses.length})</legend>
          {witnesses.map((w, i) => (
            <div className="row" key={i}>
              <input placeholder="Name" value={w.name} onChange={(e) => patchWitness(i, { name: e.target.value })} />
              <select
                value={w.supports ?? ''}
                onChange={(e) => patchWitness(i, { supports: e.target.value === '' ? null : Number(e.target.value) })}
              >
                <option value="">Supports: nobody in particular</option>
                {parties.map((p, j) => (
                  <option key={j} value={j}>
                    Supports: {partyLabel(p, j)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="ghost"
                onClick={() => setWitnesses((l) => l.filter((_, j) => j !== i))}
                aria-label="Remove witness"
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" className="ghost" onClick={() => setWitnesses((l) => [...l, { name: '', supports: null }])}>
            + Add witness
          </button>
        </fieldset>

        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={!canSave}>
          Create and open
        </button>
      </form>
    </main>
  );
}
