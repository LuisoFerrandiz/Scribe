import type { Extraction, PartyRow } from './types';

type Proposed = Extraction['parties'][number];
export type PartyInput = Omit<PartyRow, 'id'> & { id?: number };

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const isEmpty = (p: Omit<PartyRow, 'id'>) => !p.name.trim() && !p.boat_name.trim() && !p.sail_number.trim();

// A party needs only ONE of sail number, boat or name. Two parties are the same boat when they
// share any one of them (compared ignoring case and spaces).
function same(a: Omit<PartyRow, 'id'>, b: Omit<PartyRow, 'id'>): boolean {
  return (['sail_number', 'boat_name', 'name'] as const).some((k) => a[k].trim() && b[k].trim() && norm(a[k]) === norm(b[k]));
}

// The boats of a form the case does not have yet. A boat in several forms (protestor in one,
// respondent in another) counts once; its role is not changed, and the case keeps whatever it has.
export function newParties(existing: PartyRow[], proposed: Proposed[]): Proposed[] {
  const out: Proposed[] = [];
  for (const p of proposed) {
    if (existing.some((e) => same(e, p)) || out.some((o) => same(o, p))) continue;
    out.push({ ...p });
  }
  return out;
}

// The party list to save: everything the case has, plus the new boats. A party with no data
// (did not appear) of the same role is filled in place, so its id and any witness linked to it
// survive. Nothing is removed or overwritten.
export function mergeParties(existing: PartyRow[], proposed: Proposed[]): PartyInput[] {
  const result: PartyInput[] = existing.map((e) => ({ ...e }));
  for (const p of newParties(existing, proposed)) {
    const slot = result.find((r) => r.id !== undefined && isEmpty(r) && r.role === p.role);
    if (slot) Object.assign(slot, p);
    else result.push({ ...p });
  }
  return result;
}
