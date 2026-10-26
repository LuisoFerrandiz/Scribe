import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { parsePhraseFile, phraseStatus, readPhraseFiles, syncPhrases } from './files.js';

const SCHEMA = readFileSync(path.join(import.meta.dirname, '..', '..', 'db', 'schema.sql'), 'utf-8');

const dirs: string[] = [];
const opened: DatabaseSync[] = [];
afterEach(() => {
  for (const db of opened.splice(0)) {
    try {
      db.close(); // Windows cannot delete a file that is still open
    } catch {
      /* a test already closed it */
    }
  }
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});
function tempDir() {
  const d = mkdtempSync(path.join(os.tmpdir(), 'scribe-phr-'));
  dirs.push(d);
  return d;
}
function newDb() {
  const db = new DatabaseSync(path.join(tempDir(), 'x.sqlite'));
  opened.push(db);
  db.exec(SCHEMA);
  return db;
}
const put = (dir: string, name: string, text: string) => writeFileSync(path.join(dir, name), text, 'utf-8');

describe('parsePhraseFile (formato A)', () => {
  it('reads a phrase with and without label, multi-line, and keeps the text verbatim', () => {
    const r = parsePhraseFile(
      'c.md',
      '# Conclusions\nbox: conclusion\n\n### 60.4(c)(3)\nSo [X] [Y] is [valid|invalid].\n\nSecond paragraph.\n\n###\nNo label here.\n',
    );
    expect(r.errors).toEqual([]);
    expect(r.phrases).toEqual([
      { box: 'conclusion', label: '60.4(c)(3)', body: 'So [X] [Y] is [valid|invalid].\n\nSecond paragraph.' },
      { box: 'conclusion', label: '', body: 'No label here.' },
    ]);
  });

  it('turns CRLF into LF and ignores a byte-order mark', () => {
    const r = parsePhraseFile('c.md', '﻿box: decision\r\n### A\r\nline1\r\nline2\r\n');
    expect(r.phrases).toEqual([{ box: 'decision', label: 'A', body: 'line1\nline2' }]);
  });

  it('lets a phrase set its own section, which wins over the default', () => {
    const r = parsePhraseFile('n.md', '### Withdraw\nbox: facts_found\nFact.\n### Withdraw\nbox: decision\nDecision.\n');
    expect(r.errors).toEqual([]);
    expect(r.phrases.map((p) => p.box)).toEqual(['facts_found', 'decision']);
    expect(r.phrases[0].body).toBe('Fact.');
  });

  it('accepts repeated labels', () => {
    const r = parsePhraseFile('c.md', 'box: conclusion\n### 62.1\nA\n### 62.1\nB\n');
    expect(r.phrases.map((p) => p.body)).toEqual(['A', 'B']);
  });

  it('does not take "####" or a "box:" line inside the text as a new phrase or section', () => {
    const r = parsePhraseFile('c.md', 'box: conclusion\n### A\nfirst\nbox: decision\n#### not a title\n');
    expect(r.phrases).toEqual([{ box: 'conclusion', label: 'A', body: 'first\nbox: decision\n#### not a title' }]);
  });

  it('reports each error with file, line and reason', () => {
    const r = parsePhraseFile('bad.md', 'box: nothing\nstray text\n### A\nbody\n### B\n\n### C\nbox: wrong\ntext\n');
    expect(r.errors.map((e) => [e.file, e.line])).toEqual([
      ['bad.md', 1], // unknown default section
      ['bad.md', 2], // text before the first phrase
      ['bad.md', 5], // phrase without text
      ['bad.md', 8], // unknown own section
    ]);
    expect(r.errors[0].message).toMatch(/unknown section "nothing"/);
  });

  it('reports a phrase with no section at all', () => {
    const r = parsePhraseFile('x.md', '### A\ntext\n');
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatchObject({ file: 'x.md', line: 1 });
    expect(r.errors[0].message).toMatch(/no section/);
  });
});

describe('readPhraseFiles', () => {
  it('reads only .md files, in name order', () => {
    const d = tempDir();
    put(d, 'b.md', 'box: conclusion\n### B\nb\n');
    put(d, 'a.md', 'box: decision\n### A\na\n');
    put(d, 'notes.txt', 'ignored');
    expect(readPhraseFiles(d).files.map((f) => f.file)).toEqual(['a.md', 'b.md']);
  });

  it('treats a missing folder and an empty folder as errors, not as an empty library', () => {
    expect(readPhraseFiles(path.join(tempDir(), 'nope')).errors[0].message).toMatch(/not found/);
    expect(readPhraseFiles(tempDir()).errors[0].message).toMatch(/no \.md files/);
  });
});

describe('syncPhrases', () => {
  const FILE = 'box: conclusion\n### 62.1\nOne.\n### 62.2\nTwo.\n';

  function ftsRows(db: DatabaseSync) {
    return (db.prepare('SELECT COUNT(*) n FROM phrase_fts').get() as { n: number }).n;
  }
  function ids(db: DatabaseSync) {
    return db.prepare('SELECT id FROM phrase ORDER BY id').all().map((r) => Number((r as { id: number }).id));
  }

  it('loads an empty database from the files, table and text search together', () => {
    const db = newDb();
    const d = tempDir();
    put(d, 'c.md', FILE);
    const r = syncPhrases(db, d);
    expect(r).toEqual({ ok: true, changed: true, total: 2, added: 2, removed: 0 });
    expect(ftsRows(db)).toBe(2);
    const hit = db.prepare("SELECT p.label FROM phrase_fts JOIN phrase p ON p.id = phrase_fts.phrase_id WHERE phrase_fts MATCH 'Two'").all();
    expect(hit).toHaveLength(1);
  });

  it('writes nothing when the files already match', () => {
    const db = newDb();
    const d = tempDir();
    put(d, 'c.md', FILE);
    syncPhrases(db, d);
    const before = ids(db);
    expect(syncPhrases(db, d)).toEqual({ ok: true, changed: false, total: 2, added: 0, removed: 0 });
    expect(ids(db)).toEqual(before); // same rows, same ids
  });

  it('reflects an edited, an added and a deleted phrase, and keeps the table and the search in step', () => {
    const db = newDb();
    const d = tempDir();
    put(d, 'c.md', FILE);
    syncPhrases(db, d);
    put(d, 'c.md', 'box: conclusion\n### 62.1\nOne, edited.\n### 62.3\nThree.\n');
    const r = syncPhrases(db, d);
    expect(r).toEqual({ ok: true, changed: true, total: 2, added: 2, removed: 2 });
    expect((db.prepare('SELECT body FROM phrase ORDER BY body').all() as { body: string }[]).map((x) => x.body)).toEqual([
      'One, edited.',
      'Three.',
    ]);
    expect(ftsRows(db)).toBe(2);
    expect(db.prepare("SELECT 1 FROM phrase_fts WHERE phrase_fts MATCH 'Two'").all()).toHaveLength(0);
  });

  it("never touches the owner's own phrases", () => {
    const db = newDb();
    db.exec("INSERT INTO phrase (box, label, body, origin) VALUES ('decision', 'mine', 'My own wording', 'own')");
    const d = tempDir();
    put(d, 'c.md', FILE);
    syncPhrases(db, d);
    put(d, 'c.md', 'box: conclusion\n### 62.9\nOnly this.\n');
    syncPhrases(db, d);
    const rows = db.prepare('SELECT origin, body FROM phrase ORDER BY origin, body').all() as { origin: string; body: string }[];
    expect(rows).toEqual([
      { origin: 'base', body: 'Only this.' },
      { origin: 'own', body: 'My own wording' },
    ]);
  });

  it('with an error in any file changes nothing and returns the errors', () => {
    const db = newDb();
    const d = tempDir();
    put(d, 'c.md', FILE);
    syncPhrases(db, d);
    const before = db.prepare('SELECT id, box, label, body FROM phrase ORDER BY id').all();
    put(d, 'c.md', 'box: conclusion\n### 62.1\nChanged.\n');
    put(d, 'broken.md', 'box: nothing\n### A\ntext\n');
    const r = syncPhrases(db, d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatchObject({ file: 'broken.md', line: 1 });
    expect(db.prepare('SELECT id, box, label, body FROM phrase ORDER BY id').all()).toEqual(before);
    expect(ftsRows(db)).toBe(2);
  });

  it('with no folder or no files changes nothing and does not throw', () => {
    const db = newDb();
    const d = tempDir();
    put(d, 'c.md', FILE);
    syncPhrases(db, d);
    expect(syncPhrases(db, path.join(d, 'missing')).ok).toBe(false);
    expect(syncPhrases(db, tempDir()).ok).toBe(false);
    expect(ids(db)).toHaveLength(2);
  });

  it('rolls back when the insert fails midway', () => {
    const db = newDb();
    const d = tempDir();
    put(d, 'c.md', FILE);
    syncPhrases(db, d);
    // A CHECK-breaking section cannot come from the parser, so break the table instead.
    db.exec('CREATE TRIGGER boom BEFORE INSERT ON phrase WHEN NEW.body = \'Boom.\' BEGIN SELECT RAISE(ABORT, \'boom\'); END');
    put(d, 'c.md', 'box: conclusion\n### A\nFine.\n### B\nBoom.\n');
    const r = syncPhrases(db, d);
    expect(r.ok).toBe(false);
    expect((db.prepare('SELECT COUNT(*) n FROM phrase').get() as { n: number }).n).toBe(2);
    expect(ftsRows(db)).toBe(2);
  });
});

describe('phraseStatus', () => {
  it('counts the phrases of each file and says whether the files differ from the database', () => {
    const db = newDb();
    const d = tempDir();
    put(d, 'a.md', 'box: conclusion\n### A\none\n');
    put(d, 'b.md', 'box: decision\n### B\ntwo\n### C\nthree\n');
    let s = phraseStatus(db, d);
    expect(s.files.map((f) => [f.file, f.count])).toEqual([['a.md', 1], ['b.md', 2]]);
    expect(s).toMatchObject({ total: 3, differs: true, added: 3, removed: 0 });
    syncPhrases(db, d);
    s = phraseStatus(db, d);
    expect(s).toMatchObject({ total: 3, differs: false, added: 0, removed: 0 });
  });

  it('lists the errors per file and does not claim a difference', () => {
    const db = newDb();
    const d = tempDir();
    put(d, 'a.md', 'box: nothing\n### A\none\n');
    const s = phraseStatus(db, d);
    expect(s.errors).toHaveLength(1);
    expect(s.files[0].errors).toHaveLength(1);
    expect(s.differs).toBe(false);
  });
});

describe('syncPhrasesAtStart', () => {
  it('never throws: broken files, a missing folder and a closed database all just log', async () => {
    const { syncPhrasesAtStart } = await import('./files.js');
    const db = newDb();
    const d = tempDir();
    put(d, 'c.md', 'box: conclusion\n### A\none\n');
    const log: string[] = [];
    syncPhrasesAtStart(db, d, (m) => log.push(m));
    expect(log[0]).toMatch(/reloaded.*1 phrases/);
    put(d, 'c.md', 'box: nothing\n### A\none\n');
    syncPhrasesAtStart(db, d, (m) => log.push(m));
    expect(log[1]).toMatch(/NOT reloaded.*c\.md:1/);
    syncPhrasesAtStart(db, path.join(d, 'missing'), (m) => log.push(m));
    expect(log[2]).toMatch(/NOT reloaded/);
    db.close();
    expect(() => syncPhrasesAtStart(db, d, (m) => log.push(m))).not.toThrow();
    expect(log[3]).toMatch(/NOT reloaded/);
  });
});
