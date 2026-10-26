import { describe, expect, it } from 'vitest';
import { blockAfterEdit, findMarks, nextMark, replaceMark } from './fillMarks';

describe('findMarks', () => {
  it('finds alternatives with their options', () => {
    const m = findMarks('The protest is [valid|invalid] under RRS 60.');
    expect(m).toEqual([{ kind: 'choice', start: 15, end: 30, options: ['valid', 'invalid'] }]);
  });

  it('finds data marks, with and without a known name', () => {
    const m = findMarks('On {date} hearing {##} for {X}.');
    expect(m.map((x) => (x.kind === 'hole' ? x.name : 'choice'))).toEqual(['date', '##', 'X']);
    expect(m[0]).toMatchObject({ start: 3, end: 9 });
  });

  it('allows a data mark inside an option, and finds it once the option is chosen', () => {
    const text = 'in [race {##}|the series] it';
    const [choice] = findMarks(text);
    expect(choice).toMatchObject({ kind: 'choice', options: ['race {##}', 'the series'] });
    expect(findMarks(replaceMark(text, choice, 'race {##}')).map((x) => x.kind)).toEqual(['hole']);
  });

  it('leaves everything else as plain text (D-007)', () => {
    expect(findMarks('She was [injured] and [unclosed')).toEqual([]); // no "|", never closed
    expect(findMarks('A [b|c [d|e]] f')).toEqual([]); // a bracket inside a bracket
    expect(findMarks('A [b|] c')).toEqual([]); // empty option
    expect(findMarks('A [ | ] c')).toEqual([]); // blank options
    expect(findMarks('A {} b {a b {c} d')).toEqual([{ kind: 'hole', start: 12, end: 15, name: 'c' }]); // empty or broken braces are text
    expect(findMarks('x [1|2|3|4|5|6|7|8|9|10] y')).toEqual([]); // more than nine options
    expect(findMarks('x [1|2|3|4|5|6|7|8|9] y')).toHaveLength(1);
  });

  it('looks for data marks inside plain brackets, which are not marks themselves', () => {
    expect(findMarks('[injury of {X}]').map((x) => x.kind)).toEqual(['hole']);
  });

  it('only looks inside the given range', () => {
    const text = '[a|b] and [c|d]';
    expect(findMarks(text, 9, text.length)).toHaveLength(1);
  });
});

describe('nextMark and replaceMark', () => {
  const text = 'A [x|y] B {date} C';
  const block = { start: 0, end: text.length };

  it('finds the first mark at or after a position', () => {
    expect(nextMark(text, block, 0)).toMatchObject({ kind: 'choice' });
    expect(nextMark(text, block, 7)).toMatchObject({ kind: 'hole', name: 'date' });
    expect(nextMark(text, block, 12)).toBeNull();
  });

  it('does not look outside the block', () => {
    expect(nextMark(text, { start: 0, end: 8 }, 7)).toBeNull();
  });

  it('replaces exactly the mark', () => {
    const m = nextMark(text, block, 0)!;
    expect(replaceMark(text, m, 'x')).toBe('A x B {date} C');
  });
});

describe('blockAfterEdit', () => {
  const before = 'Intro. [a|b] tail.';
  const block = { start: 7, end: 12 };

  it('follows an edit inside the block', () => {
    const after = 'Intro. a tail.';
    expect(blockAfterEdit(before, after, block)).toEqual({ start: 7, end: 8 });
  });

  it('follows typing at the end of the block', () => {
    expect(blockAfterEdit(before, 'Intro. [a|b]XY tail.', block)).toEqual({ start: 7, end: 14 });
  });

  it('closes the block when the edit is outside it', () => {
    expect(blockAfterEdit(before, 'Intro!! [a|b] tail.', block)).toBeNull();
    expect(blockAfterEdit(before, 'Intro. [a|b] tail. More', block)).toBeNull();
  });
});
