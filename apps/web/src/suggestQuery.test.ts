import { describe, expect, it } from 'vitest';
import { applySuggestion, queryBefore } from './suggestQuery';

describe('queryBefore (text the suggestion is based on)', () => {
  it('starts after the last full stop, but not at the dot of a rule number', () => {
    expect(queryBefore('Done. The respondent withdrew', 29)).toBe('The respondent withdrew');
    expect(queryBefore('As per rule 63.1 the', 20)).toBe('As per rule 63.1 the');
  });
  it('starts after the last line break', () => {
    expect(queryBefore('first line\nsecond bit', 21)).toBe('second bit');
  });
  it('keeps at most 12 words', () => {
    expect(queryBefore('a b c d e f g h i j k l m n', 27)).toBe('c d e f g h i j k l m n');
  });
  it('ends at the cursor', () => {
    expect(queryBefore('hello world there', 11)).toBe('hello world');
  });
});

describe('applySuggestion', () => {
  const rule = { kind: 'rule', citation: 'RRS 63.1', heading: 'h', doc_title: 'd', typed: true } as const;
  const phrase = { kind: 'phrase', id: 1, label: 'l', body: 'Protest withdrawn.' } as const;

  it('replaces a typed rule fragment with the verified citation', () => {
    expect(applySuggestion('As per rule 63.1', 16, rule)).toEqual({ value: 'As per RRS 63.1', caret: 15 });
    expect(applySuggestion('As per rule 63.1 and', 16, rule)).toEqual({ value: 'As per RRS 63.1 and', caret: 15 });
  });
  it('adds an inferred citation after a space', () => {
    expect(applySuggestion('under', 5, { ...rule, typed: false })).toEqual({ value: 'under RRS 63.1', caret: 14 });
  });
  it('puts a phrase at the cursor, starting a new line when the text goes on', () => {
    expect(applySuggestion('', 0, phrase)).toEqual({ value: 'Protest withdrawn.', caret: 18 });
    expect(applySuggestion('a\n', 2, phrase)).toEqual({ value: 'a\nProtest withdrawn.', caret: 20 });
  });
});
