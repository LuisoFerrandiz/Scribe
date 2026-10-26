import type { Dispatch, SetStateAction } from 'react';
import type { Role } from '../types';

// Drafts of the people of a case, shared by the new-case page and the case-data panel.
// `id` is set for a party that already exists on the server, so saving keeps it (and the
// witnesses linked to it).
export interface PartyDraft {
  id?: number;
  role: Role;
  name: string;
  boat_name: string;
  sail_number: string;
}
export interface WitnessDraft {
  name: string;
  supports: number | null; // index in the party list
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'protestor', label: 'Protestor' },
  { value: 'respondent', label: 'Respondent' },
  { value: 'other', label: 'Other' },
];

export const emptyParty = (role: Role): PartyDraft => ({ role, name: '', boat_name: '', sail_number: '' });

const partyLabel = (p: PartyDraft, i: number) => p.name || p.sail_number || p.boat_name || `Party ${i + 1}`;

type Setter<T> = Dispatch<SetStateAction<T>>;

export function PartiesEditor({
  parties,
  setParties,
  setWitnesses,
}: {
  parties: PartyDraft[];
  setParties: Setter<PartyDraft[]>;
  setWitnesses: Setter<WitnessDraft[]>;
}) {
  const patch = (i: number, p: Partial<PartyDraft>) =>
    setParties((list) => list.map((x, j) => (j === i ? { ...x, ...p } : x)));

  function remove(i: number) {
    setParties((list) => list.filter((_, j) => j !== i));
    // Witnesses pointing at the removed party lose it; later indexes shift down.
    setWitnesses((list) =>
      list.map((w) => ({
        ...w,
        supports: w.supports === null || w.supports === i ? null : w.supports > i ? w.supports - 1 : w.supports,
      })),
    );
  }

  return (
    <fieldset>
      <legend>Parties ({parties.length})</legend>
      {parties.map((p, i) => (
        <div className="row" key={p.id ?? `new-${i}`}>
          <select value={p.role} onChange={(e) => patch(i, { role: e.target.value as Role })}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <input placeholder="Name" value={p.name} onChange={(e) => patch(i, { name: e.target.value })} />
          <input placeholder="Boat" value={p.boat_name} onChange={(e) => patch(i, { boat_name: e.target.value })} />
          <input
            placeholder="Sail no."
            value={p.sail_number}
            onChange={(e) => patch(i, { sail_number: e.target.value })}
          />
          <button type="button" className="ghost" onClick={() => remove(i)} aria-label="Remove party">
            ×
          </button>
        </div>
      ))}
      <button type="button" className="ghost" onClick={() => setParties((l) => [...l, emptyParty('other')])}>
        + Add party
      </button>
    </fieldset>
  );
}

export function WitnessesEditor({
  parties,
  witnesses,
  setWitnesses,
}: {
  parties: PartyDraft[];
  witnesses: WitnessDraft[];
  setWitnesses: Setter<WitnessDraft[]>;
}) {
  const patch = (i: number, w: Partial<WitnessDraft>) =>
    setWitnesses((list) => list.map((x, j) => (j === i ? { ...x, ...w } : x)));

  return (
    <fieldset>
      <legend>Witnesses ({witnesses.length})</legend>
      {witnesses.map((w, i) => (
        <div className="row" key={i}>
          <input placeholder="Name" value={w.name} onChange={(e) => patch(i, { name: e.target.value })} />
          <select
            value={w.supports ?? ''}
            onChange={(e) => patch(i, { supports: e.target.value === '' ? null : Number(e.target.value) })}
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
  );
}
