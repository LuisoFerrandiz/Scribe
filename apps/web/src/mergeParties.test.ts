import { describe, expect, it } from 'vitest';
import { mergeParties, newParties } from './mergeParties';
import type { PartyRow } from './types';

const existing: PartyRow[] = [
  { id: 1, role: 'protestor', name: '', boat_name: '', sail_number: '' },
  { id: 2, role: 'respondent', name: 'Bob', boat_name: 'Gale', sail_number: 'FRA 3' },
];
const proposed = [
  { role: 'protestor' as const, name: 'Ana', boat_name: 'Wind', sail_number: 'ESP 12' },
  { role: 'respondent' as const, name: 'bob', boat_name: 'gale', sail_number: 'fra  3' },
  { role: 'other' as const, name: 'Zed', boat_name: '', sail_number: 'GBR 9' },
];

describe('accepting a protest form proposal', () => {
  it('proposes only boats the case does not have (ignoring case and spaces)', () => {
    expect(newParties(existing, proposed).map((p) => p.sail_number)).toEqual(['ESP 12', 'GBR 9']);
  });

  it('fills an empty party of the same role in place and appends the rest, removing nothing', () => {
    const merged = mergeParties(existing, proposed);
    expect(merged).toHaveLength(3);
    expect(merged[0]).toMatchObject({ id: 1, name: 'Ana' }); // id kept, so witnesses stay linked
    expect(merged[1].id).toBe(2);
    expect(merged[2]).toMatchObject({ name: 'Zed' });
    expect(merged[2].id).toBeUndefined();
  });

  it('adds nothing the second time', () => {
    const merged = mergeParties(existing, proposed).map((p, i) => ({ ...p, id: p.id ?? 10 + i }));
    expect(newParties(merged, proposed)).toHaveLength(0);
  });

  it('knows a boat by any one of sail number, boat or name', () => {
    const only = (k: 'name' | 'boat_name' | 'sail_number', v: string): PartyRow => ({
      id: 1,
      role: 'respondent',
      name: '',
      boat_name: '',
      sail_number: '',
      [k]: v,
    });
    const p = { role: 'respondent' as const, name: 'Pavel Grachev', boat_name: 'OKI', sail_number: 'UAE 3854' };
    expect(newParties([only('sail_number', 'UAE 3854')], [p])).toEqual([]);
    expect(newParties([only('boat_name', 'oki')], [p])).toEqual([]);
    expect(newParties([only('name', 'PAVEL GRACHEV')], [p])).toEqual([]);
    expect(newParties([only('sail_number', 'ESP 1')], [p])).toHaveLength(1);
  });
});

// A real case: three protests of one race (08, 09, 11), four boats, one boat in two roles.
describe('one case with several protest forms', () => {
  const caseParties: PartyRow[] = [
    { id: 4, role: 'protestor', name: '', boat_name: '', sail_number: 'GBR 3834' },
    { id: 5, role: 'respondent', name: '', boat_name: '', sail_number: 'ITA 3856' },
    { id: 6, role: 'respondent', name: 'Pavel GRACHEV', boat_name: 'OKI', sail_number: 'UAE 3854' },
    { id: 9, role: 'protestor', name: 'Deizy Nhaquile', boat_name: '', sail_number: 'MOZ 3513' },
  ];
  const fromForms = [
    { role: 'protestor' as const, name: 'John Pollard', boat_name: 'XCELLENT', sail_number: 'GBR 3834' },
    { role: 'respondent' as const, name: 'Pavel GRACHEV', boat_name: 'OKI', sail_number: 'UAE 3854' },
    { role: 'protestor' as const, name: 'Pavel GRACHEV', boat_name: 'OKI', sail_number: 'UAE 3854' },
    { role: 'respondent' as const, name: 'Furio Patrizio MONACO', boat_name: 'BILLO BACCANI', sail_number: 'ITA 3856' },
    { role: 'protestor' as const, name: 'Deizy Nhaquile', boat_name: '', sail_number: 'MOZ 3513' },
    { role: 'respondent' as const, name: 'John POLLARD', boat_name: 'XCELLENT', sail_number: 'GBR 3834' },
  ];

  it('has nothing to add: the four boats are already there, each with its sail number', () => {
    expect(newParties(caseParties, fromForms)).toEqual([]);
  });

  it('lists a boat that appears in two forms once, with the first details seen', () => {
    const merged = mergeParties([], fromForms);
    expect(merged.map((p) => p.sail_number)).toEqual(['GBR 3834', 'UAE 3854', 'ITA 3856', 'MOZ 3513']);
    expect(merged[1].role).toBe('respondent'); // the first role seen is kept
  });
});
