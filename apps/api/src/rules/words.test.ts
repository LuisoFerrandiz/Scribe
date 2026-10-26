import { describe, expect, it } from 'vitest';
import { ftsExpression, lastWords, sharedCount, significantStems, stem, tokens } from './words.js';

describe('words', () => {
  it('splits into lowercase words and numbers', () => {
    expect(tokens('Rule 63.1: Hearing!')).toEqual(['rule', '63', '1', 'hearing']);
  });

  it('stems regular and irregular forms to the same word', () => {
    expect(stem('withdrew')).toBe('withdraw');
    expect(stem('withdrawn')).toBe('withdraw');
    expect(stem('protests')).toBe('protest');
    expect(stem('constructor')).toBe('constructor'); // not an object property lookup
  });

  it('ignores stop words and very short words, keeps numbers', () => {
    const s = significantStems('The protestor withdrew it, in 63');
    expect(s.has('the')).toBe(false);
    expect(s.has('protestor')).toBe(true);
    expect(s.has('withdraw')).toBe(true);
    expect(s.has('63')).toBe(true);
  });

  it('counts shared significant words', () => {
    const a = significantStems('the protest was withdrawn');
    const b = significantStems('Protest withdrew before the hearing');
    expect(sharedCount(a, b)).toBe(2);
  });

  it('takes the last words only', () => {
    expect(lastWords('a b c d e', 3)).toBe('c d e');
    expect(lastWords('  one  ', 5)).toBe('one');
  });

  it('builds a safe FTS expression', () => {
    // quotes and operator words in the input cannot reach FTS5 as syntax
    expect(ftsExpression('rule "63.1" OR x', 'AND')).toBe('"rule" AND "63" AND "1"');
    expect(ftsExpression('the of', 'OR')).toBeNull();
    expect(ftsExpression('hearing proc', 'AND', true)).toBe('"hearing" AND "proc"*');
  });
});
