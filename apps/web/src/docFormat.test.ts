import { describe, expect, it } from 'vitest';
import { fullText, headerBlock, partyLine, titleLines } from './docFormat';
import type { CaseFull } from './types';

const c = {
  id: 3,
  case_number: 'P 07/B',
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

  it('writes the title and the header', () => {
    expect(titleLines(c)).toEqual(['Case P 07/B - Test Cup', 'Protest + Redress - 2026-10-25 18:30']);
    expect(headerBlock(c)).toContain('Witnesses: W1');
  });

  it('writes the whole decision with the five titled sections, trimmed', () => {
    const text = fullText(c, { procedural: 'Proc.', facts: ' Facts ', conclusion: '', rules_text: 'RRS 63.1', decision: 'Done.' });
    expect(text).toContain('Procedural Matters\nProc.');
    expect(text).toContain('Facts Found\nFacts\n');
    expect(text.endsWith('Done.\n')).toBe(true);
  });
});
