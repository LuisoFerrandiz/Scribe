import type { WitnessRow } from './types';

export type WitnessInput = { name: string; supports_party_id: number | null };

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

// The proposed names the case does not have yet (same name ignoring case and spaces = already there).
export function newWitnesses(existing: WitnessRow[], proposed: string[]): string[] {
  const seen = new Set(existing.map((w) => norm(w.name)).filter(Boolean));
  const out: string[] = [];
  for (const name of proposed) {
    const key = norm(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name.trim());
  }
  return out;
}

// The witness list to save (the API replaces the whole list): everything the case has, in order,
// plus the new names. An empty row is filled in place instead of leaving a gap. Existing witnesses
// keep the party they support; new ones support none.
export function mergeWitnesses(existing: WitnessRow[], proposed: string[]): WitnessInput[] {
  const result: WitnessInput[] = existing.map((w) => ({ name: w.name, supports_party_id: w.supports_party_id }));
  for (const name of newWitnesses(existing, proposed)) {
    const empty = result.find((r) => !r.name.trim());
    if (empty) empty.name = name;
    else result.push({ name, supports_party_id: null });
  }
  return result;
}
