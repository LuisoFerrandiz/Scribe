import { describe, expect, it } from 'vitest';
import { ExtractError, cleanRaces, normalize } from './normalize.js';

describe('normalize (what the model returned -> a proposal)', () => {
  it('keeps the known shape and drops what is not known', () => {
    const out = normalize(
      '```json\n{"case_number":" 7 ","claim_types":["protest","bogus","redress"],"parties":[' +
        '{"role":"protestor","name":" Ana ","boat_name":"Wind","sail_number":"ESP 12"},' +
        '{"role":"weird","name":"","boat_name":"","sail_number":""},' +
        '{"role":"respondent","sail_number":"FRA 3"},"x",null]}\n```',
    );
    expect(out.case_number).toBe('7');
    expect(out.claim_types).toEqual(['protest', 'redress']);
    expect(out.parties).toEqual([
      { role: 'protestor', name: 'Ana', boat_name: 'Wind', sail_number: 'ESP 12' },
      { role: 'respondent', name: '', boat_name: '', sail_number: 'FRA 3' },
    ]);
  });

  it('turns an unknown role into "other" when the party has data', () => {
    const out = normalize('{"parties":[{"role":"witness-ish","name":"Zed"}]}');
    expect(out.parties[0].role).toBe('other');
  });

  it('finds the JSON inside surrounding prose', () => {
    expect(normalize('Here you go: {"case_number":"3"} thanks').case_number).toBe('3');
  });

  it('gives an empty proposal for a wrong shape, and an error for no JSON', () => {
    expect(normalize('{"parties":"no"}')).toEqual({ case_number: '', race: '', claim_types: [], parties: [] });
    expect(() => normalize('nothing here')).toThrow(ExtractError);
    expect(() => normalize('{bad}')).toThrow(/no valid JSON/);
  });
});

describe('race', () => {
  it('is taken as the form wrote it, trimmed', () => {
    expect(normalize('{"race":" 5 "}').race).toBe('5');
    expect(normalize('{"race":"Race 3"}').race).toBe('Race 3');
  });
  it('lists each distinct race once, in order', () => {
    expect(cleanRaces('5, 5, 5')).toBe('5');
    expect(cleanRaces('5, 6 ,5')).toBe('5, 6');
  });
  it('is empty when the form has none, or when it is not text', () => {
    expect(normalize('{"case_number":"7"}').race).toBe('');
    expect(cleanRaces(5)).toBe('');
    expect(cleanRaces(null)).toBe('');
  });
  it('is never longer than the case field', () => {
    expect(cleanRaces(Array.from({ length: 30 }, (_, i) => String(i + 10)).join(',')).length).toBeLessThanOrEqual(40);
  });
});
