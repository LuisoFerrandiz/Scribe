import { describe, expect, it } from 'vitest';
import { lostSections } from './conflict';
import type { Sections } from './types';

const sec = (over: Partial<Sections> = {}): Sections => ({
  procedural: '',
  facts: '',
  conclusion: '',
  rules_text: '',
  decision: '',
  ...over,
});

describe('lostSections (A-6: what to offer back after a two-tab conflict)', () => {
  it('offers the sections I changed that the other tab replaced', () => {
    const base = sec({ facts: 'old' });
    expect(lostSections(sec({ facts: 'mine' }), sec({ facts: 'theirs' }), base)).toEqual(['facts']);
  });

  it('does not offer a section only the other tab changed', () => {
    const base = sec({ conclusion: 'old' });
    const mine = sec({ conclusion: 'old', facts: 'mine' });
    const theirs = sec({ conclusion: 'their edit', facts: 'mine' });
    // conclusion: I did not touch it, so restoring it would overwrite their work.
    // facts: the server already has the same text, so nothing is lost.
    expect(lostSections(mine, theirs, base)).toEqual([]);
  });

  it('offers only the sections that are really different', () => {
    const base = sec();
    const mine = sec({ procedural: 'p', facts: 'f' });
    const theirs = sec({ procedural: 'p', facts: 'other', decision: 'd' });
    expect(lostSections(mine, theirs, base)).toEqual(['facts']);
  });

  it('offers nothing when the texts are the same', () => {
    expect(lostSections(sec({ facts: 'x' }), sec({ facts: 'x' }), sec())).toEqual([]);
  });
});
