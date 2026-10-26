import { describe, expect, it } from 'vitest';
import { matchData } from './dataMatch';

const terms = ['Ana Beltran', 'Anabel Soto', 'ESP 12', 'ESP 13', 'Wind Chaser', 'Henrik Lund', 'GBR 7'];

describe('matchData (completion of names and sail numbers, RF-004)', () => {
  it.each([
    ['The boat Wi', 'nd Chaser'],
    ['Ana ', 'Beltran'], // a unique match after the space
    ['Ana B', 'eltran'],
    ['GB', 'R 7'],
    ['He', 'nrik Lund'],
    ['said Lu', 'nd'],
  ])('completes %j', (typed, added) => {
    expect(matchData(typed, terms)).toBe(added);
  });

  it.each([
    ['An'], // two candidates (Ana Beltran, Anabel Soto): shows nothing
    ['ES'], // ESP 12 and ESP 13
    ['ESP 1'],
    ['ESP 12'], // already complete
    ['G'], // fewer than two characters
    ['he'], // lowercase of a capitalised name: prose, not a name
    ['Henrikk'], // does not continue any term
    ['xHe'], // not at the start of a word
  ])('shows nothing for %j', (typed) => {
    expect(matchData(typed, terms)).toBeNull();
  });
});
