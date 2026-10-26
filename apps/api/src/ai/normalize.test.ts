import { describe, expect, it } from 'vitest';
import { ExtractError, normalize } from './normalize.js';

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
    expect(normalize('{"parties":"no"}')).toEqual({ case_number: '', claim_types: [], parties: [] });
    expect(() => normalize('nothing here')).toThrow(ExtractError);
    expect(() => normalize('{bad}')).toThrow(/no valid JSON/);
  });
});
