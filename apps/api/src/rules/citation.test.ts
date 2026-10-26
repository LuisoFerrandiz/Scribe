import { describe, expect, it } from 'vitest';
import { parseCitation, resolveCitation } from './citation.js';

describe('parseCitation', () => {
  it('reads RRS, Rule and R. as RRS', () => {
    expect(parseCitation('RRS 63.1')?.prefix).toBe('RRS');
    expect(parseCitation('rule 63.1')?.prefix).toBe('RRS');
    expect(parseCitation('R. 63.1')?.prefix).toBe('RRS');
  });

  it('reads a bare number without a prefix', () => {
    const c = parseCitation('63.1');
    expect(c?.prefix).toBeNull();
    expect(c?.number).toBe('63.1');
  });

  it('keeps sub-paragraph suffixes', () => {
    expect(parseCitation('RRS 63.1(a)(2)')?.suffix).toBe('(a)(2)');
  });

  it('rejects text that is not a citation', () => {
    expect(parseCitation('the protest was withdrawn')).toBeNull();
  });

  it('resolves only with an explicit prefix', () => {
    expect(resolveCitation('63.1')).toBeNull();
    expect(resolveCitation('RRS 63.1')?.number).toBe('63.1');
  });
});
