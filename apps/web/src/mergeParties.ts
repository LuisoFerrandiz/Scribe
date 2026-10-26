import type { Extraction, PartyRow } from './types';

type Proposed = Extraction['parties'][number];
export type PartyInput = Omit<PartyRow, 'id'> & { id?: number };

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const isEmpty = (p: Omit<PartyRow, 'id'>) => !p.name.trim() && !p.boat_name.trim() && !p.sail_number.trim();

// The same boat: equal sail number, or (when either has none) equal name and boat.
function same(a: Omit<PartyRow, 'id'>, b: Omit<PartyRow, 'id'>): boolean {
  if (a.sail_number.trim() && b.sail_number.trim()) return norm(a.sail_number) === norm(b.sail_number);
  return norm(a.name) === norm(b.name) && norm(a.boat_name) === norm(b.boat_name);
}

// Parties of the form that the case does not have yet.
export function newParties(existing: PartyRow[], proposed: Proposed[]): Proposed[] {
  return proposed.filter((p) => !existing.some((e) => same(e, p)));
}

// Accepting adds the new parties. An existing party with no data (did not appear) of the same
// role is filled in place, so its id and any witness linked to it survive; nothing is removed.
export function mergeParties(existing: PartyRow[], proposed: Proposed[]): PartyInput[] {
  const result: PartyInput[] = existing.map((e) => ({ ...e }));
  for (const p of newParties(existing, proposed)) {
    const slot = result.find((r) => r.id !== undefined && isEmpty(r) && r.role === p.role);
    if (slot) {
      Object.assign(slot, p);
    } else {
      result.push({ ...p });
    }
  }
  return result;
}
