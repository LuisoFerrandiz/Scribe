import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { ensureColumns } from './columns.js';

const dirs: string[] = [];
const opened: DatabaseSync[] = [];
const open = (file: string) => {
  const db = new DatabaseSync(file);
  opened.push(db);
  return db;
};
function tempDir() {
  const d = mkdtempSync(path.join(os.tmpdir(), 'scribe-cols-'));
  dirs.push(d);
  return d;
}
afterEach(() => {
  for (const db of opened.splice(0)) db.close(); // Windows cannot delete a file that is still open
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const change = { table: 'protest_case', column: 'race', ddl: "TEXT NOT NULL DEFAULT ''" };

// A database as it was before the column existed, with a real-looking case in it.
function oldDb(dir: string) {
  const db = open(path.join(dir, 'old.sqlite'));
  db.exec('CREATE TABLE protest_case (id INTEGER PRIMARY KEY, case_number TEXT NOT NULL, facts TEXT NOT NULL DEFAULT "")');
  db.prepare('INSERT INTO protest_case (case_number, facts) VALUES (?, ?)').run('08, 09, 11', 'written text');
  return db;
}

describe('ensureColumns', () => {
  it('adds the column, keeps every row, and leaves a backup that has the old data', () => {
    const dir = tempDir();
    const db = oldDb(dir);
    expect(ensureColumns(db, dir, [change])).toEqual(['protest_case.race']);

    expect(db.prepare('SELECT case_number, facts, race FROM protest_case').all()).toEqual([
      { case_number: '08, 09, 11', facts: 'written text', race: '' },
    ]);
    const backups = readdirSync(dir).filter((f) => f.startsWith('backup-'));
    expect(backups).toHaveLength(1);
    const copy = open(path.join(dir, backups[0]));
    expect(copy.prepare('SELECT case_number, facts FROM protest_case').all()).toEqual([
      { case_number: '08, 09, 11', facts: 'written text' },
    ]);
    // the copy is from before the change
    expect((copy.prepare('PRAGMA table_info(protest_case)').all() as { name: string }[]).some((c) => c.name === 'race')).toBe(false);
  });

  it('does nothing, and writes no backup, when the column is already there', () => {
    const dir = tempDir();
    const db = oldDb(dir);
    ensureColumns(db, dir, [change]);
    const before = readdirSync(dir).length;
    expect(ensureColumns(db, dir, [change])).toEqual([]);
    expect(readdirSync(dir)).toHaveLength(before);
  });

  it('leaves a database without the table alone (schema.sql creates it complete)', () => {
    const dir = tempDir();
    const db = open(path.join(dir, 'empty.sqlite'));
    expect(ensureColumns(db, dir, [change])).toEqual([]);
    expect(existsSync(path.join(dir, 'empty.sqlite'))).toBe(true);
    expect(readdirSync(dir).filter((f) => f.startsWith('backup-'))).toHaveLength(0);
  });
});
