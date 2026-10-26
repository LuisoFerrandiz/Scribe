import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ApiError, AuthError, api, serverError } from '../api';
import type { CaseFull, Kind } from '../types';
import { PartiesEditor, WitnessesEditor, type PartyDraft, type WitnessDraft } from './PeopleEditor';

type Update = Pick<Partial<CaseFull>, 'case_number' | 'race' | 'kinds' | 'hearing_at' | 'parties' | 'witnesses'>;

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: 'protest', label: 'Protest' },
  { value: 'redress', label: 'Redress' },
  { value: 'reopening', label: 'Reopening' },
];

const partiesOf = (c: CaseFull): PartyDraft[] =>
  c.parties.map((p) => ({ id: p.id, role: p.role, name: p.name, boat_name: p.boat_name, sail_number: p.sail_number }));
const witnessesOf = (c: CaseFull): WitnessDraft[] =>
  c.witnesses.map((w) => {
    const i = c.parties.findIndex((p) => p.id === w.supports_party_id);
    return { name: w.name, supports: i === -1 ? null : i };
  });

// SPEC-002 A-3: edit what the case was created with (number, kinds, hearing time, parties, witnesses)
// next to the document, which stays on screen and is never touched. The drafts live here even while
// the panel is closed, so closing it by accident loses nothing; they are replaced by the server data
// only when there are no unsaved changes.
export function CaseDataPanel({
  c,
  open,
  onApply,
  onClose,
  onDirtyChange,
  onAuthLost,
}: {
  c: CaseFull;
  open: boolean;
  onApply: (patch: Update) => void;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onAuthLost: () => void;
}) {
  const [caseNumber, setCaseNumber] = useState(c.case_number);
  const [race, setRace] = useState(c.race ?? '');
  const [kinds, setKinds] = useState<Kind[]>(c.kinds.split(',') as Kind[]);
  const [hearingAt, setHearingAt] = useState(c.hearing_at?.slice(0, 16) ?? '');
  const [parties, setParties] = useState<PartyDraft[]>(() => partiesOf(c));
  const [witnesses, setWitnesses] = useState<WitnessDraft[]>(() => witnessesOf(c));
  const [dirty, setDirtyState] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const first = useRef<HTMLInputElement>(null);

  function setDirty(v: boolean) {
    setDirtyState(v);
    onDirtyChange(v);
  }
  // Every edit through these marks the drafts as unsaved.
  const edited =
    <T,>(set: Dispatch<SetStateAction<T>>): Dispatch<SetStateAction<T>> =>
    (v) => {
      setDirty(true);
      set(v);
    };

  // Server data changed (accepted protest form, saved here): take it, unless there are unsaved edits.
  useEffect(() => {
    if (dirty) return;
    setCaseNumber(c.case_number);
    setRace(c.race ?? '');
    setKinds(c.kinds.split(',') as Kind[]);
    setHearingAt(c.hearing_at?.slice(0, 16) ?? '');
    setParties(partiesOf(c));
    setWitnesses(witnessesOf(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.case_number, c.race, c.kinds, c.hearing_at, c.parties, c.witnesses]);

  useEffect(() => {
    if (open) first.current?.focus();
  }, [open]);

  async function save() {
    setBusy(true);
    setError('');
    const patch: Update = {};
    try {
      const updated = await api.patchCase(c.id, {
        case_number: caseNumber.trim(),
        race: race.trim(),
        kinds,
        hearing_at: hearingAt || null,
      });
      patch.case_number = updated.case_number;
      patch.race = updated.race;
      patch.kinds = updated.kinds;
      patch.hearing_at = updated.hearing_at;
      const savedParties = await api.setParties(c.id, parties);
      patch.parties = savedParties;
      patch.witnesses = await api.setWitnesses(
        c.id,
        witnesses
          .filter((w) => w.name.trim() !== '')
          .map((w) => ({
            name: w.name.trim(),
            supports_party_id: w.supports === null ? null : (savedParties[w.supports]?.id ?? null),
          })),
      );
      setDirtyState(false);
      onDirtyChange(false);
      onApply(patch);
    } catch (e) {
      // What was saved before the failure is shown, so the case and the screen agree.
      if (Object.keys(patch).length > 0) onApply(patch);
      if (e instanceof AuthError) onAuthLost();
      else setError(e instanceof ApiError ? serverError(e) : 'Not saved: could not reach the server. Your edits are kept here.');
    } finally {
      setBusy(false);
    }
  }

  const canSave = !busy && dirty && caseNumber.trim() !== '' && kinds.length > 0;
  const toggleKind = (k: Kind) => {
    setDirty(true);
    setKinds((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]));
  };

  return (
    <aside
      className={`case-panel${open ? ' open' : ''}`}
      aria-hidden={!open}
      aria-label="Case data"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div className="panel-head">
        <strong>Case data</strong>
        {dirty && <span className="muted">unsaved changes</span>}
        <span className="spacer" />
        <button className="ghost" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="newcase">
        <fieldset>
          <legend>Case</legend>
          <div className="row">
            <input
              ref={first}
              placeholder="Case number"
              value={caseNumber}
              onChange={(e) => {
                setDirty(true);
                setCaseNumber(e.target.value);
              }}
            />
            <input
              className="narrow"
              placeholder="Race"
              aria-label="Race"
              value={race}
              onChange={(e) => {
                setDirty(true);
                setRace(e.target.value);
              }}
            />
            <input
              type="datetime-local"
              value={hearingAt}
              onChange={(e) => {
                setDirty(true);
                setHearingAt(e.target.value);
              }}
            />
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
        <PartiesEditor parties={parties} setParties={edited(setParties)} setWitnesses={edited(setWitnesses)} />
        <WitnessesEditor parties={parties} witnesses={witnesses} setWitnesses={edited(setWitnesses)} />
        {error && <p className="error">{error}</p>}
        <div className="row panel-actions">
          <button onClick={() => void save()} disabled={!canSave}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </aside>
  );
}
