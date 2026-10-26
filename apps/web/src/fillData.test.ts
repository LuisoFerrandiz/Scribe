import { describe, expect, it } from 'vitest';
import { identify, offersFor, type FillCase } from './fillData';
import { findMarks } from './fillMarks';

const party = (role: 'protestor' | 'respondent' | 'other', sail: string, boat = '', name = '') => ({
  role,
  sail_number: sail,
  boat_name: boat,
  name,
});

const base: FillCase = {
  case_number: '08, 09',
  race: '5',
  hearing_at: '2026-10-26T10:00',
  parties: [party('protestor', 'ITA 3856'), party('respondent', 'UAE 3854')],
};
const mark = (text: string) => findMarks(text)[0];

describe('identify', () => {
  it('uses the sail number, then the boat, then the person', () => {
    expect(identify({ sail_number: ' ESP 1 ', boat_name: 'Wind', name: 'Ana' })).toBe('ESP 1');
    expect(identify({ sail_number: '', boat_name: 'Wind', name: 'Ana' })).toBe('Wind');
    expect(identify({ sail_number: '', boat_name: '', name: 'Ana' })).toBe('Ana');
    expect(identify({ sail_number: '', boat_name: '', name: '' })).toBe('');
  });
});

describe('offers for a data mark', () => {
  it('knows the date of the hearing, the race and the case number', () => {
    expect(offersFor(mark('{date}'), base)).toEqual([{ label: '2026-10-26', text: '2026-10-26' }]);
    expect(offersFor(mark('{race}'), base)).toEqual([{ label: '5', text: '5' }]);
    expect(offersFor(mark('{case}'), base)).toEqual([{ label: '08, 09', text: '08, 09' }]);
  });

  it('offers nothing when the case does not have the datum or the name is not known', () => {
    expect(offersFor(mark('{date}'), { ...base, hearing_at: null })).toEqual([]);
    expect(offersFor(mark('{race}'), { ...base, race: ' ' })).toEqual([]);
    expect(offersFor(mark('{##}'), base)).toEqual([]);
    expect(offersFor(mark('{name}'), base)).toEqual([]);
  });

  it('turns X into the protestor and Y into the protested party, all of them when there are several', () => {
    expect(offersFor(mark('{X}'), base).map((o) => o.text)).toEqual(['ITA 3856']);
    const two = { ...base, parties: [...base.parties, party('respondent', '', 'Billo')] };
    expect(offersFor(mark('{Y}'), two).map((o) => o.text)).toEqual(['UAE 3854', 'Billo']);
  });

  it('offers nothing when there is no party of that role or it has no data', () => {
    expect(offersFor(mark('{Y}'), { ...base, parties: [party('protestor', 'ITA 1')] })).toEqual([]);
    expect(offersFor(mark('{X}'), { ...base, parties: [party('protestor', '')] })).toEqual([]);
    expect(offersFor(mark('{X}'), { ...base, parties: [party('other', 'ESP 9')] })).toEqual([]);
  });
});

describe('offers for alternatives', () => {
  it('lists every option as written', () => {
    expect(offersFor(mark('[valid|invalid]'), base)).toEqual([
      { label: 'valid', text: 'valid' },
      { label: 'invalid', text: 'invalid' },
    ]);
  });

  it('writes the parties in place of X and Y, and keeps the other options', () => {
    expect(offersFor(mark('[X|Y|The RC]'), base).map((o) => o.text)).toEqual(['ITA 3856', 'UAE 3854', 'The RC']);
  });

  it('keeps X as written when the case has no party of that role', () => {
    const none = { ...base, parties: [] };
    expect(offersFor(mark('[X|Y]'), none).map((o) => o.text)).toEqual(['X', 'Y']);
  });

  it('never offers more than nine', () => {
    const many = { ...base, parties: Array.from({ length: 12 }, (_, i) => party('respondent', `FRA ${i + 1}`)) };
    expect(offersFor(mark('[X|Y]'), many)).toHaveLength(9);
  });
});
