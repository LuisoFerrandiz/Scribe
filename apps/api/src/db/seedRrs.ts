import { existsSync } from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { db } from './connection.js';
import { readMarkdown } from '../resources/storage.js';

// The RRS ships with the project under data/rules/rrs and data/originals (public text).
// A fresh database has no resource rows for it, so register them once as accepted.
// Idempotent: skipped when any rrs resource exists.
const RRS_DOCS = [
  { title: 'RRS Parts', file: 'RRS_Parts-9809480a-f5d7-411a-ada9-11ef039dc4d3' },
  { title: 'RRS appendix', file: 'RRS_appendix-d328d3b7-04f1-4a1d-a7a6-e1cda08ce2eb' },
];

export async function seedRrs() {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM resource WHERE layer = 'rrs'").get() as {
    count: number;
  };
  if (count > 0) {
    console.log(`RRS already registered (${count} documents) — skipping.`);
    return;
  }

  const insert = db.prepare(
    `INSERT INTO resource (kind, layer, title, original_filename, original_path, markdown_path, status, reviewed_at)
     VALUES ('rule', 'rrs', ?, ?, ?, ?, 'accepted', datetime('now'))`,
  );
  const insertFts = db.prepare('INSERT INTO resource_fts (title, body, resource_id) VALUES (?, ?, ?)');

  for (const doc of RRS_DOCS) {
    const markdownPath = `rules/rrs/${doc.file}.md`;
    if (!existsSync(path.join(config.dataDir, markdownPath))) {
      console.warn(`RRS source missing — skipping: ${markdownPath}`);
      continue;
    }
    const result = insert.run(doc.title, `${doc.title}.pdf`, `originals/${doc.file}.pdf`, markdownPath);
    insertFts.run(doc.title, await readMarkdown(markdownPath), Number(result.lastInsertRowid));
  }
  console.log('Registered the RRS documents as accepted rule resources.');
}
