import { describe, expect, it } from 'vitest';
import { mergeWitnesses, newWitnesses } from './mergeWitnesses';
import type { WitnessRow } from './types';

const w = (id: number, name: string, supports: number | null = null): WitnessRow => ({ id, name, supports_party_id: supports });

describe('witnesses from the protest form', () => {
  it('proposes only names the case does not have, ignoring case and spaces', () => {
    expect(newWitnesses([w(1, 'Ana Ruiz')], ['ana  ruiz', 'Bo', 'bo', ''])).toEqual(['Bo']);
  });

  it('proposes nothing when the form has none', () => {
    expect(newWitnesses([w(1, 'Ana')], [])).toEqual([]);
  });

  it('keeps every existing witness and the party each supports, and appends the new ones', () => {
    expect(mergeWitnesses([w(1, 'Ana', 7)], ['Bo'])).toEqual([
      { name: 'Ana', supports_party_id: 7 },
      { name: 'Bo', supports_party_id: null },
    ]);
  });

  it('fills an empty row instead of leaving a gap', () => {
    expect(mergeWitnesses([w(1, ''), w(2, ''), w(3, 'Cy', 4)], ['Bo'])).toEqual([
      { name: 'Bo', supports_party_id: null },
      { name: '', supports_party_id: null },
      { name: 'Cy', supports_party_id: 4 },
    ]);
  });
});
