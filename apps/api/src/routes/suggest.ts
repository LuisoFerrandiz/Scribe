import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { parseCitation } from '../rules/citation.js';
import {
  ELIGIBLE_SQL,
  SECTION_COLUMNS,
  citationOfSection,
  eventIdOfCase,
  sectionsForCitation,
  type SectionRow,
} from '../rules/sectionQuery.js';
import { ftsExpression, lastWords, sharedCount, significantStems } from '../rules/words.js';

const QUERY_WORDS = 12;
const MAX_SECTION_TEXT = 20_000;
const SEARCH_PER_SOURCE = 5;
const MIN_SHARED_WORDS = 2;
const EXCERPT_CHARS = 240;
// The phrase library has no Rules Applicable box (SPEC-001 RF-005).
const PHRASE_BOXES = new Set(['procedural_matters', 'facts_found', 'conclusion', 'decision']);

interface PhraseHit {
  id: number;
  box: string;
  label: string;
  body: string;
  snippet?: string;
}

interface RuleHit {
  section_id: number;
  citation: string | null;
  heading: string;
  doc_title: string;
  source: 'rrs' | 'event';
  snippet?: string;
  excerpt: string;
  typed?: boolean; // the rule number was typed by the scribe, not inferred from words
}

function ruleHit(s: SectionRow, snippet?: string): RuleHit {
  return {
    section_id: s.id,
    citation: citationOfSection(s),
    heading: s.heading,
    doc_title: s.doc_title,
    source: s.layer === 'rrs' ? 'rrs' : 'event',
    excerpt: s.body.replace(/\s+/g, ' ').trim().slice(0, EXCERPT_CHARS),
    snippet,
  };
}

// Never throws: free text that FTS cannot parse is simply "no matches".
function phraseMatches(expr: string, box: string | null, limit: number): PhraseHit[] {
  try {
    return db
      .prepare(
        `SELECT p.id, p.box, p.label, p.body, snippet(phrase_fts, 1, '[', ']', '…', 12) AS snippet
         FROM phrase_fts JOIN phrase p ON p.id = phrase_fts.phrase_id
         WHERE phrase_fts MATCH ? AND (? IS NULL OR p.box = ?)
         ORDER BY rank LIMIT ?`,
      )
      .all(expr, box, box, limit) as unknown as PhraseHit[];
  } catch {
    return [];
  }
}

function sectionMatches(expr: string, eventId: number | null, source: 'rrs' | 'event', limit: number) {
  const layerSql = source === 'rrs' ? "r.layer = 'rrs'" : "r.layer <> 'rrs'";
  try {
    return db
      .prepare(
        `SELECT ${SECTION_COLUMNS}, snippet(rule_section_fts, 1, '[', ']', '…', 12) AS snippet
         FROM rule_section_fts
         JOIN rule_section s ON s.id = rule_section_fts.section_id
         JOIN resource r ON r.id = s.resource_id
         WHERE rule_section_fts MATCH ? AND ${ELIGIBLE_SQL} AND ${layerSql}
         ORDER BY rank LIMIT ?`,
      )
      .all(expr, eventId, limit) as unknown as (SectionRow & { snippet: string })[];
  } catch {
    return [];
  }
}

// A rule number typed in the query ("rule 62.1", "RRS 44.1", "CR 3") that resolves in the corpus.
const TYPED_RULE = /\b(?:rrs|rule|cr|nor|si)\s*\.?\s*([a-z]{0,2}\d+(?:\.\d+)*)/gi;

function typedRuleSection(query: string, eventId: number | null): SectionRow | null {
  const matches = [...query.matchAll(TYPED_RULE)];
  for (const m of matches.reverse()) {
    const parsed = parseCitation(m[0]);
    if (!parsed) continue;
    const prefix = parsed.prefix ?? 'RRS';
    const hits = sectionsForCitation({ ...parsed, prefix }, eventId);
    if (hits.length === 1) return hits[0];
  }
  return null;
}

// Highest shared-word score wins (ranking order breaks ties); below the threshold, nothing.
function best<T>(candidates: T[], score: (c: T) => number): T | null {
  let winner: T | null = null;
  let top = MIN_SHARED_WORDS - 1;
  for (const c of candidates) {
    const n = score(c);
    if (n > top) {
      top = n;
      winner = c;
    }
  }
  return winner;
}

export function registerSuggestRoutes(app: FastifyInstance) {
  // One phrase and one rule citation for the text being written (RF-005). Empty rather than
  // wrong: a phrase needs >= 2 significant words shared with the query; a rule needs its number
  // typed in the query, or >= 2 significant heading words present in the section text.
  app.get('/suggest', (req) => {
    const { q, box, case_id, text } = req.query as { q?: string; box?: string; case_id?: string; text?: string };
    const empty = { phrase: null, rule: null };
    const query = lastWords(q ?? '', QUERY_WORDS);
    if (!query) return empty;
    const sectionText = (text ?? q ?? '').slice(-MAX_SECTION_TEXT);
    const eventId = eventIdOfCase(case_id ? Number(case_id) : null);
    const queryStems = significantStems(query);

    let phrase: PhraseHit | null = null;
    if (box && PHRASE_BOXES.has(box) && queryStems.size >= MIN_SHARED_WORDS) {
      const expr = ftsExpression(query, 'OR');
      if (expr) {
        phrase = best(phraseMatches(expr, box, 10), (p) =>
          sharedCount(queryStems, significantStems(`${p.label} ${p.body}`)),
        );
      }
    }

    let rule: RuleHit | null = null;
    const typed = typedRuleSection(query, eventId);
    if (typed) {
      rule = { ...ruleHit(typed), typed: true };
    } else if (queryStems.size >= MIN_SHARED_WORDS) {
      const expr = ftsExpression(query, 'OR');
      if (expr) {
        const textStems = significantStems(sectionText);
        for (const source of ['rrs', 'event'] as const) {
          const found = best(
            sectionMatches(expr, eventId, source, 10).filter((s) => citationOfSection(s)),
            (s) => sharedCount(significantStems(s.heading), textStems),
          );
          if (found) {
            rule = ruleHit(found);
            break;
          }
        }
      }
    }
    // Already cited in this section: nothing left to offer.
    if (rule?.citation && sectionText.includes(rule.citation)) rule = null;

    return { phrase, rule: rule?.citation ? rule : null };
  });

  // Ctrl+K: each source is queried on its own, at most 5 each (RF-006).
  app.get('/search', (req) => {
    const { q, case_id } = req.query as { q?: string; case_id?: string };
    const empty = { phrases: [], rrs: [], event: [] };
    const query = (q ?? '').trim();
    if (!query) return empty;
    const eventId = eventIdOfCase(case_id ? Number(case_id) : null);

    const typed = typedRuleSection(query, eventId);
    const typedHit = typed ? ruleHit(typed) : null;

    const run = <T>(find: (expr: string) => T[]): T[] => {
      const and = ftsExpression(query, 'AND', true);
      const found = and ? find(and) : [];
      if (found.length > 0) return found;
      const or = ftsExpression(query, 'OR', true);
      return or ? find(or) : [];
    };

    const phrases = run((e) => phraseMatches(e, null, SEARCH_PER_SOURCE));
    const toHits = (rows: (SectionRow & { snippet: string })[]) => rows.map((s) => ruleHit(s, s.snippet));
    let rrs = run((e) => toHits(sectionMatches(e, eventId, 'rrs', SEARCH_PER_SOURCE)));
    const event = run((e) => toHits(sectionMatches(e, eventId, 'event', SEARCH_PER_SOURCE)));

    if (typedHit && typedHit.source === 'rrs') {
      rrs = [typedHit, ...rrs.filter((r) => r.section_id !== typedHit.section_id)].slice(0, SEARCH_PER_SOURCE);
    }
    return { phrases, rrs, event: typedHit && typedHit.source === 'event' ? [typedHit, ...event.filter((r) => r.section_id !== typedHit.section_id)].slice(0, SEARCH_PER_SOURCE) : event };
  });
}
