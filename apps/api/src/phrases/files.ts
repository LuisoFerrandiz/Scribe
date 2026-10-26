import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

// SPEC-006: the base phrases live in .md files the owner edits by hand, and the database is
// reloaded from them. One phrase is a "### label" line (or "###" alone) followed by its text.

export const BOXES = ['procedural_matters', 'facts_found', 'conclusion', 'decision'] as const;
export type Box = (typeof BOXES)[number];

export interface Phrase {
  box: Box;
  label: string;
  body: string;
}

export interface PhraseError {
  file: string;
  line: number; // 1-based; 0 when the problem is the folder itself
  message: string;
}

const TITLE = /^###(\s.*)?$/; // "###" or "### label", never "####"
const BOX_LINE = /^box:\s*(.*?)\s*$/i;
const isBox = (v: string): v is Box => (BOXES as readonly string[]).includes(v);

// The text of a phrase is kept verbatim (brackets, "|" and all): only the ends are trimmed and CRLF becomes LF.
export function parsePhraseFile(file: string, text: string): { phrases: Phrase[]; errors: PhraseError[] } {
  const lines = text.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/);
  const phrases: Phrase[] = [];
  const errors: PhraseError[] = [];
  const fail = (line: number, message: string) => errors.push({ file, line, message });

  let defaultBox: Box | null = null;
  let seenDefault = false;
  let badSection = false; // a section error was already reported: do not repeat it for every phrase
  let current: { line: number; label: string; box: Box | null; body: string[] } | null = null;

  const close = () => {
    if (!current) return;
    const body = current.body.join('\n').trim();
    if (!body) fail(current.line, 'phrase has no text');
    else if (!current.box) {
      if (!badSection) fail(current.line, 'phrase has no section: put "box: <section>" in the file header or under its ###');
    } else phrases.push({ box: current.box, label: current.label, body });
    current = null;
  };

  lines.forEach((raw, i) => {
    const n = i + 1;
    if (TITLE.test(raw)) {
      close();
      current = { line: n, label: raw.slice(3).trim(), box: defaultBox, body: [] };
      return;
    }
    if (!current) {
      // Header: blank lines, an informative "# title", and the default section.
      const box = BOX_LINE.exec(raw);
      if (!raw.trim() || /^#\s/.test(raw) || raw.trim() === '#') return;
      if (box) {
        if (seenDefault) fail(n, 'box is set twice in the header');
        seenDefault = true;
        if (isBox(box[1])) defaultBox = box[1];
        else {
          badSection = true;
          fail(n, `unknown section "${box[1]}" (use ${BOXES.join(', ')})`);
        }
        return;
      }
      fail(n, 'text before the first phrase (a phrase starts with a ### line)');
      return;
    }
    // The line right under the ### may set this phrase's own section.
    const own = current.body.length === 0 ? BOX_LINE.exec(raw) : null;
    if (own) {
      if (isBox(own[1])) current.box = own[1];
      else {
        badSection = true;
        fail(n, `unknown section "${own[1]}" (use ${BOXES.join(', ')})`);
      }
      return;
    }
    current.body.push(raw);
  });
  close();

  return { phrases, errors };
}

export interface FileResult {
  file: string;
  phrases: Phrase[];
  errors: PhraseError[];
}

// Every .md in the folder, in name order. A missing folder or no files is an error, not an empty library.
export function readPhraseFiles(dir: string): { files: FileResult[]; errors: PhraseError[] } {
  let names: string[];
  try {
    names = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.md')).sort();
  } catch {
    return { files: [], errors: [{ file: dir, line: 0, message: 'phrases folder not found' }] };
  }
  if (names.length === 0) return { files: [], errors: [{ file: dir, line: 0, message: 'no .md files in the phrases folder' }] };

  const files: FileResult[] = [];
  for (const file of names) {
    try {
      files.push({ file, ...parsePhraseFile(file, readFileSync(path.join(dir, file), 'utf-8')) });
    } catch (e) {
      files.push({ file, phrases: [], errors: [{ file, line: 0, message: `cannot read the file: ${(e as Error).message}` }] });
    }
  }
  return { files, errors: files.flatMap((f) => f.errors) };
}

const key = (p: Phrase) => `${p.box}\u0000${p.label}\u0000${p.body}`;

function counts(list: Phrase[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of list) m.set(key(p), (m.get(key(p)) ?? 0) + 1);
  return m;
}

// How many phrases the files add and remove compared with the base phrases the database has (as multisets).
function diff(fromFiles: Phrase[], inDb: Phrase[]): { added: number; removed: number } {
  const a = counts(fromFiles);
  const b = counts(inDb);
  let added = 0;
  let removed = 0;
  for (const [k, n] of a) added += Math.max(0, n - (b.get(k) ?? 0));
  for (const [k, n] of b) removed += Math.max(0, n - (a.get(k) ?? 0));
  return { added, removed };
}

const basePhrases = (conn: DatabaseSync) =>
  conn.prepare("SELECT box, label, body FROM phrase WHERE origin = 'base'").all() as unknown as Phrase[];

export interface PhraseStatus {
  files: { file: string; count: number; errors: PhraseError[] }[];
  errors: PhraseError[];
  total: number;
  differs: boolean;
  added: number;
  removed: number;
}

// What a reload would do, without doing it.
export function phraseStatus(conn: DatabaseSync, dir: string): PhraseStatus {
  const { files, errors } = readPhraseFiles(dir);
  const all = files.flatMap((f) => f.phrases);
  const { added, removed } = errors.length > 0 ? { added: 0, removed: 0 } : diff(all, basePhrases(conn));
  return {
    files: files.map((f) => ({ file: f.file, count: f.phrases.length, errors: f.errors })),
    errors,
    total: all.length,
    differs: added + removed > 0,
    added,
    removed,
  };
}

export type SyncResult =
  | { ok: true; changed: boolean; total: number; added: number; removed: number }
  | { ok: false; errors: PhraseError[] };

// Makes the base phrases of the database equal to the files. All or nothing: any error in any file
// leaves the database untouched. The owner's own phrases are never touched. Nothing is written when
// the files already match.
export function syncPhrases(conn: DatabaseSync, dir: string): SyncResult {
  const { files, errors } = readPhraseFiles(dir);
  if (errors.length > 0) return { ok: false, errors };

  const all = files.flatMap((f) => f.phrases);
  const { added, removed } = diff(all, basePhrases(conn));
  if (added + removed === 0) return { ok: true, changed: false, total: all.length, added: 0, removed: 0 };

  conn.exec('BEGIN');
  try {
    // phrase_id is UNINDEXED in the FTS table: no type coercion, so compare with real integers.
    const ids = conn.prepare("SELECT id FROM phrase WHERE origin = 'base'").all() as unknown as { id: number }[];
    const delFts = conn.prepare('DELETE FROM phrase_fts WHERE phrase_id = ?');
    for (const r of ids) delFts.run(Number(r.id));
    conn.exec("DELETE FROM phrase WHERE origin = 'base'");
    const insert = conn.prepare("INSERT INTO phrase (box, label, body, origin) VALUES (?, ?, ?, 'base')");
    const insertFts = conn.prepare('INSERT INTO phrase_fts (label, body, phrase_id) VALUES (?, ?, ?)');
    for (const p of all) {
      const res = insert.run(p.box, p.label, p.body);
      insertFts.run(p.label, p.body, Number(res.lastInsertRowid));
    }
    conn.exec('COMMIT');
  } catch (e) {
    conn.exec('ROLLBACK');
    return { ok: false, errors: [{ file: dir, line: 0, message: `database error, nothing was changed: ${(e as Error).message}` }] };
  }
  return { ok: true, changed: true, total: all.length, added, removed };
}

// For the server start: reload, log what happened, and never throw (a bad .md must not stop the API).
export function syncPhrasesAtStart(conn: DatabaseSync, dir: string, log: (msg: string) => void = console.log): void {
  try {
    const r = syncPhrases(conn, dir);
    if (!r.ok) {
      log(`Phrases NOT reloaded, keeping the ones already loaded. ${r.errors.map((e) => `${e.file}:${e.line} ${e.message}`).join(' | ')}`);
    } else if (r.changed) {
      log(`Phrases reloaded from ${dir}: ${r.total} phrases (+${r.added}, -${r.removed}).`);
    } else {
      log(`Phrases up to date (${r.total}).`);
    }
  } catch (e) {
    log(`Phrases NOT reloaded, keeping the ones already loaded: ${(e as Error).message}`);
  }
}
