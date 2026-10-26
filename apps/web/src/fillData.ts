import { MAX_OPTIONS, type Mark } from './fillMarks';
import type { PartyRow } from './types';

// What the case knows, for the data marks of a phrase (SPEC-007).
export interface FillCase {
  case_number: string;
  race: string;
  hearing_at: string | null;
  parties: Pick<PartyRow, 'role' | 'name' | 'boat_name' | 'sail_number'>[];
}

// One thing the scribe can pick or accept for a mark: `label` is what the line shows, `text` what is written.
export interface Offer {
  label: string;
  text: string;
}

// How a party is named in a decision: by sail number, else by boat, else by person.
export function identify(p: Pick<PartyRow, 'name' | 'boat_name' | 'sail_number'>): string {
  return p.sail_number.trim() || p.boat_name.trim() || p.name.trim();
}

// X is the protestor and Y the protested party.
const ROLE = { X: 'protestor', Y: 'respondent' } as const;

function partyOffers(letter: 'X' | 'Y', c: FillCase): Offer[] {
  return c.parties
    .filter((p) => p.role === ROLE[letter])
    .map((p) => identify(p))
    .filter(Boolean)
    .map((id) => ({ label: id, text: id }));
}

const datePart = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : '');

// The offers for a mark, never more than the nine a key can choose. For a hole: what the case knows
// (nothing when it does not know). For alternatives: every option, with X and Y turned into the
// parties of the case; an X or Y with no party of that role stays as the phrase wrote it.
export function offersFor(mark: Mark, c: FillCase): Offer[] {
  if (mark.kind === 'hole') {
    const known: Record<string, string> = { date: datePart(c.hearing_at), race: c.race.trim(), case: c.case_number.trim() };
    if (mark.name === 'X' || mark.name === 'Y') return partyOffers(mark.name, c).slice(0, MAX_OPTIONS);
    const v = known[mark.name];
    return v ? [{ label: v, text: v }] : [];
  }
  const out: Offer[] = [];
  for (const option of mark.options) {
    const t = option.trim();
    if (t === 'X' || t === 'Y') {
      const parties = partyOffers(t, c);
      if (parties.length > 0) {
        out.push(...parties);
        continue;
      }
    }
    out.push({ label: option, text: option });
  }
  return out.slice(0, MAX_OPTIONS);
}
