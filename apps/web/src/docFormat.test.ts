import { describe, expect, it } from 'vitest';
import { fullText, headerBlock, partyLine, raceLabel, titleLines } from './docFormat';
import type { CaseFull } from './types';

const c = {
  id: 3,
  case_number: 'P 07/B',
  race: '',
  event_name: 'Test Cup',
  kinds: 'protest,redress',
  hearing_at: '2026-10-25T18:30',
  parties: [
    { id: 1, role: 'protestor', name: 'Ana', boat_name: 'Wind', sail_number: 'ESP 12' },
    { id: 2, role: 'respondent', name: '', boat_name: '', sail_number: '' },
  ],
  witnesses: [{ id: 1, name: 'W1', supports_party_id: null }],
} as unknown as CaseFull;

describe('text for the official form', () => {
  it('writes a party line, with "-" for a party that gave no data', () => {
    expect(partyLine(c.parties[0])).toBe('Protestor: Ana, Wind, ESP 12');
    expect(partyLine(c.parties[1])).toBe('Respondent: -');
  });

  it('writes the title and the header, with no race and no gap when the case has none', () => {
    expect(titleLines(c)).toEqual(['Case P 07/B - Test Cup', 'Protest + Redress - 2026-10-25 18:30']);
    expect(headerBlock(c)).not.toContain('Race');
    expect(headerBlock(c)).toContain('Witnesses: W1');
  });

  it('puts the race in the second line when the case has one', () => {
    expect(titleLines({ ...c, race: '5' })[1]).toBe('Race 5 - Protest + Redress - 2026-10-25 18:30');
    expect(titleLines({ ...c, race: '5, 6' })[1]).toBe('Race 5, 6 - Protest + Redress - 2026-10-25 18:30');
    expect(titleLines({ ...c, race: 'Race 3' })[1]).toMatch(/^Race 3 - /); // not "Race Race 3"
  });

  it('labels a race the way the form wrote it', () => {
    expect(raceLabel('5')).toBe('Race 5');
    expect(raceLabel(' R3 ')).toBe('R3');
    expect(raceLabel('')).toBe('');
  });

  it('writes the whole decision with the five titled sections, trimmed', () => {
    const text = fullText(c, { procedural: 'Proc.', facts: ' Facts ', conclusion: '', rules_text: 'RRS 63.1', decision: 'Done.' });
    expect(text).toContain('Procedural Matters\nProc.');
    expect(text).toContain('Facts Found\nFacts\n');
    expect(text.endsWith('Done.\n')).toBe(true);
  });
});
