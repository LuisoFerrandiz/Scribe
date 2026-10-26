import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

// schema.sql only creates what is missing (CREATE TABLE IF NOT EXISTS), so a column added to a table
// that already exists in a user's database needs this: an additive ALTER, which keeps every row.
// Before the first change a consistent copy of the database is written next to it.

export interface ColumnChange {
  table: string;
  column: string;
  ddl: string; // e.g. "TEXT NOT NULL DEFAULT ''"
}

export const COLUMN_CHANGES: ColumnChange[] = [{ table: 'protest_case', column: 'race', ddl: "TEXT NOT NULL DEFAULT ''" }];

const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13);

// Returns the columns it added. `backupDir` is where the copy goes; nothing is written when nothing is missing.
export function ensureColumns(conn: DatabaseSync, backupDir: string, changes: ColumnChange[] = COLUMN_CHANGES): string[] {
  const missing = changes.filter((c) => {
    const cols = conn.prepare(`PRAGMA table_info(${c.table})`).all() as { name: string }[];
    // A table that does not exist yet is created complete by schema.sql, so there is nothing to add.
    return cols.length > 0 && !cols.some((x) => x.name === c.column);
  });
  if (missing.length === 0) return [];

  const copy = path.join(backupDir, `backup-${stamp()}.sqlite`);
  conn.exec(`VACUUM INTO '${copy.replace(/'/g, "''")}'`);
  for (const c of missing) conn.exec(`ALTER TABLE ${c.table} ADD COLUMN ${c.column} ${c.ddl}`);
  console.log(`Added ${missing.map((c) => `${c.table}.${c.column}`).join(', ')}. Backup: ${copy}`);
  return missing.map((c) => `${c.table}.${c.column}`);
}
