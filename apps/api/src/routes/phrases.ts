import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../auth/guard.js';
import { db } from '../db/connection.js';
import { phraseStatus, syncPhrases } from '../phrases/files.js';
import { PHRASES_DIR } from '../phrases/location.js';

interface PhraseRow {
  id: number;
  box: string;
  label: string;
  body: string;
  origin: 'base' | 'own';
  created_at: string;
}

// Phrase library. Base phrases come from the .md files in data/phrases/base (SPEC-006, D-006): the
// files are edited by hand and the database is reloaded from them; the routes never edit or delete a
// base phrase. Own phrases are the owner's (same base/own split as example resources, D-007).
export function registerPhraseRoutes(app: FastifyInstance) {
  // What a reload would do: the phrases of each file and whether the files differ from the database.
  app.get('/phrases/status', { preHandler: requireAdmin }, () => phraseStatus(db, PHRASES_DIR));

  // All or nothing: any error in any file changes nothing and comes back with file, line and reason.
  app.post('/phrases/reload', { preHandler: requireAdmin }, (_req, reply) => {
    const r = syncPhrases(db, PHRASES_DIR);
    if (!r.ok) return reply.code(422).send({ errors: r.errors });
    return { total: r.total, added: r.added, removed: r.removed, changed: r.changed };
  });

  app.get('/phrases', (req) => {
    const { box } = req.query as { box?: string };
    if (box) {
      return db.prepare('SELECT * FROM phrase WHERE box = ? ORDER BY origin, label').all(box);
    }
    return db.prepare('SELECT * FROM phrase ORDER BY box, origin, label').all();
  });

  app.get('/phrases/search', (req) => {
    const { q, box } = req.query as { q?: string; box?: string };
    if (!q?.trim()) return [];
    // SPEC-034 RF-016: free text with punctuation or FTS operators makes MATCH throw;
    // a query that cannot be parsed is simply "no matches".
    try {
      return db
        .prepare(
          `SELECT p.id, p.box, p.label, p.body, p.origin,
                  snippet(phrase_fts, 1, '[', ']', '…', 12) AS snippet
           FROM phrase_fts
           JOIN phrase p ON p.id = phrase_fts.phrase_id
           WHERE phrase_fts MATCH ?
             AND (? IS NULL OR p.box = ?)
           ORDER BY rank
           LIMIT 25`,
        )
        .all(q.trim(), box ?? null, box ?? null) as unknown as (PhraseRow & { snippet: string })[];
    } catch {
      return [];
    }
  });

  app.post('/phrases', (req, reply) => {
    const body = req.body as Partial<PhraseRow>;
    if (!body.box || !body.body?.trim()) {
      return reply.code(400).send({ error: 'box and body are required' });
    }
    const result = db
      .prepare("INSERT INTO phrase (box, label, body, origin) VALUES (?, ?, ?, 'own')")
      .run(body.box, body.label?.trim() ?? '', body.body.trim());
    const row = db.prepare('SELECT * FROM phrase WHERE id = ?').get(result.lastInsertRowid) as unknown as PhraseRow;
    db.prepare('INSERT INTO phrase_fts (label, body, phrase_id) VALUES (?, ?, ?)').run(
      row.label,
      row.body,
      row.id,
    );
    reply.code(201).send(row);
  });

  app.delete('/phrases/:id', (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare('SELECT * FROM phrase WHERE id = ?').get(id) as PhraseRow | undefined;
    if (!row) return reply.code(404).send({ error: 'not found' });
    if (row.origin === 'base') return reply.code(403).send({ error: 'base phrases cannot be deleted' });

    // FTS5 UNINDEXED columns skip SQLite's usual type-affinity coercion —
    // a string '1' never matches a stored integer 1 (same bug class as
    // resources.ts's resource_fts deletes).
    db.prepare('DELETE FROM phrase_fts WHERE phrase_id = ?').run(Number(id));
    db.prepare('DELETE FROM phrase WHERE id = ?').run(id);
    reply.code(204).send();
  });
}
