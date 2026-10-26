import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { inTransaction } from '../db/transaction.js';
import { deleteAttachmentFiles } from '../case-attachments/storage.js';

const KINDS = ['protest', 'redress', 'reopening'] as const;
const ROLES = ['protestor', 'respondent', 'other'] as const;
const SECTIONS = ['procedural', 'facts', 'conclusion', 'rules_text', 'decision'] as const;
type Section = (typeof SECTIONS)[number];

const MAX_PEOPLE = 200;
const MAX_TEXT = 200_000;

interface CaseRow {
  id: number;
  event_id: number;
  case_number: string;
  kinds: string;
  hearing_at: string | null;
  updated_at: string;
}

interface PartyInput {
  id?: number;
  role?: string;
  name?: string;
  boat_name?: string;
  sail_number?: string;
}

interface WitnessInput {
  id?: number;
  name?: string;
  supports_party_id?: number | null;
}

function parseKinds(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const kinds = KINDS.filter((k) => value.includes(k));
  return kinds.length === value.length ? kinds.join(',') : null;
}

function caseById(id: string | number) {
  return db.prepare('SELECT * FROM protest_case WHERE id = ?').get(id) as CaseRow | undefined;
}

function partiesOf(caseId: number) {
  return db
    .prepare('SELECT id, role, name, boat_name, sail_number FROM party WHERE case_id = ? ORDER BY position, id')
    .all(caseId);
}

function witnessesOf(caseId: number) {
  return db
    .prepare('SELECT id, name, supports_party_id FROM witness WHERE case_id = ? ORDER BY position, id')
    .all(caseId);
}

function insertParty(caseId: number, p: PartyInput, position: number) {
  db.prepare(
    'INSERT INTO party (case_id, role, name, boat_name, sail_number, position) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(caseId, p.role ?? 'other', p.name?.trim() ?? '', p.boat_name?.trim() ?? '', p.sail_number?.trim() ?? '', position);
}

function validParties(list: PartyInput[]): boolean {
  return list.every((p) => !p.role || (ROLES as readonly string[]).includes(p.role));
}

function docOf(caseId: number) {
  return db
    .prepare('SELECT procedural, facts, conclusion, rules_text, decision, updated_at FROM protest_case WHERE id = ?')
    .get(caseId);
}

function fullCase(caseId: number) {
  const row = db
    .prepare(
      `SELECT c.id, c.event_id, c.case_number, c.kinds, c.hearing_at, c.procedural, c.facts, c.conclusion,
              c.rules_text, c.decision, c.updated_at, e.name AS event_name, e.timezone AS event_timezone
       FROM protest_case c JOIN event e ON e.id = c.event_id WHERE c.id = ?`,
    )
    .get(caseId) as Record<string, unknown>;
  return { ...row, parties: partiesOf(caseId), witnesses: witnessesOf(caseId) };
}

export function registerCaseRoutes(app: FastifyInstance) {
  app.get('/cases', (req) => {
    const { event_id } = req.query as { event_id?: string };
    return db
      .prepare(
        `SELECT c.id, c.event_id, c.case_number, c.kinds, c.hearing_at, c.updated_at, e.name AS event_name
         FROM protest_case c JOIN event e ON e.id = c.event_id
         WHERE (? IS NULL OR c.event_id = ?)
         ORDER BY c.updated_at DESC`,
      )
      .all(event_id ?? null, event_id ?? null);
  });

  app.post('/cases', (req, reply) => {
    const body = (req.body ?? {}) as {
      event_id?: number;
      case_number?: string;
      kinds?: unknown;
      hearing_at?: string | null;
      parties?: PartyInput[];
    };
    const caseNumber = body.case_number?.trim();
    const kinds = body.kinds === undefined ? 'protest' : parseKinds(body.kinds);
    const parties = body.parties ?? [];
    if (!body.event_id || !caseNumber) return reply.code(400).send({ error: 'event_id and case_number are required' });
    if (!kinds) return reply.code(400).send({ error: 'invalid kinds' });
    if (!Array.isArray(parties) || parties.length > MAX_PEOPLE || !validParties(parties)) {
      return reply.code(400).send({ error: 'invalid parties' });
    }
    if (!db.prepare('SELECT 1 FROM event WHERE id = ?').get(body.event_id)) {
      return reply.code(400).send({ error: 'unknown event' });
    }
    if (db.prepare('SELECT 1 FROM protest_case WHERE event_id = ? AND case_number = ?').get(body.event_id, caseNumber)) {
      return reply.code(409).send({ error: 'case number already exists in this event' });
    }

    const id = inTransaction(() => {
      const result = db
        .prepare('INSERT INTO protest_case (event_id, case_number, kinds, hearing_at) VALUES (?, ?, ?, ?)')
        .run(body.event_id!, caseNumber, kinds, body.hearing_at || null);
      const caseId = Number(result.lastInsertRowid);
      parties.forEach((p, i) => insertParty(caseId, p, i));
      return caseId;
    });
    reply.code(201).send(fullCase(id));
  });

  app.get('/cases/:id', (req, reply) => {
    const { id } = req.params as { id: string };
    if (!caseById(id)) return reply.code(404).send({ error: 'not found' });
    return fullCase(Number(id));
  });

  app.patch('/cases/:id', (req, reply) => {
    const { id } = req.params as { id: string };
    const row = caseById(id);
    if (!row) return reply.code(404).send({ error: 'not found' });
    const body = (req.body ?? {}) as { case_number?: string; kinds?: unknown; hearing_at?: string | null };

    const caseNumber = body.case_number === undefined ? row.case_number : body.case_number.trim();
    const kinds = body.kinds === undefined ? row.kinds : parseKinds(body.kinds);
    if (!caseNumber) return reply.code(400).send({ error: 'case_number cannot be empty' });
    if (!kinds) return reply.code(400).send({ error: 'invalid kinds' });
    const clash = db
      .prepare('SELECT 1 FROM protest_case WHERE event_id = ? AND case_number = ? AND id <> ?')
      .get(row.event_id, caseNumber, row.id);
    if (clash) return reply.code(409).send({ error: 'case number already exists in this event' });

    const hearingAt = body.hearing_at === undefined ? row.hearing_at : body.hearing_at || null;
    db.prepare('UPDATE protest_case SET case_number = ?, kinds = ?, hearing_at = ? WHERE id = ?').run(
      caseNumber,
      kinds,
      hearingAt,
      row.id,
    );
    return fullCase(row.id);
  });

  // Deletes the case with its parties, witnesses and attachment rows (cascade) and the attached
  // protest form files on disk. There is no undo.
  app.delete('/cases/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!caseById(id)) return reply.code(404).send({ error: 'not found' });
    const files = db
      .prepare('SELECT original_path, markdown_path FROM case_attachment WHERE case_id = ?')
      .all(id) as { original_path: string; markdown_path: string | null }[];
    db.prepare('DELETE FROM protest_case WHERE id = ?').run(id);
    for (const f of files) await deleteAttachmentFiles({ originalPath: f.original_path, markdownPath: f.markdown_path });
    reply.code(204).send();
  });

  // Replaces the whole list. Items whose id belongs to the case are updated in place (witness
  // references stay valid); items without id are inserted; missing ones are deleted.
  app.put('/cases/:id/parties', (req, reply) => {
    const { id } = req.params as { id: string };
    const row = caseById(id);
    if (!row) return reply.code(404).send({ error: 'not found' });
    const parties = ((req.body ?? {}) as { parties?: PartyInput[] }).parties;
    if (!Array.isArray(parties) || parties.length > MAX_PEOPLE || !validParties(parties)) {
      return reply.code(400).send({ error: 'invalid parties' });
    }
    inTransaction(() => {
      const existing = new Set(
        (db.prepare('SELECT id FROM party WHERE case_id = ?').all(row.id) as { id: number }[]).map((r) => r.id),
      );
      const keep = new Set<number>();
      parties.forEach((p, i) => {
        if (p.id && existing.has(p.id)) {
          keep.add(p.id);
          db.prepare(
            'UPDATE party SET role = ?, name = ?, boat_name = ?, sail_number = ?, position = ? WHERE id = ?',
          ).run(p.role ?? 'other', p.name?.trim() ?? '', p.boat_name?.trim() ?? '', p.sail_number?.trim() ?? '', i, p.id);
        } else {
          insertParty(row.id, p, i);
        }
      });
      for (const partyId of existing) {
        if (!keep.has(partyId)) db.prepare('DELETE FROM party WHERE id = ?').run(partyId);
      }
    });
    return partiesOf(row.id);
  });

  app.put('/cases/:id/witnesses', (req, reply) => {
    const { id } = req.params as { id: string };
    const row = caseById(id);
    if (!row) return reply.code(404).send({ error: 'not found' });
    const witnesses = ((req.body ?? {}) as { witnesses?: WitnessInput[] }).witnesses;
    if (!Array.isArray(witnesses) || witnesses.length > MAX_PEOPLE) {
      return reply.code(400).send({ error: 'invalid witnesses' });
    }
    inTransaction(() => {
      const partyIds = new Set(
        (db.prepare('SELECT id FROM party WHERE case_id = ?').all(row.id) as { id: number }[]).map((r) => r.id),
      );
      db.prepare('DELETE FROM witness WHERE case_id = ?').run(row.id);
      witnesses.forEach((w, i) => {
        const supports = w.supports_party_id && partyIds.has(w.supports_party_id) ? w.supports_party_id : null;
        db.prepare('INSERT INTO witness (case_id, name, supports_party_id, position) VALUES (?, ?, ?, ?)').run(
          row.id,
          w.name?.trim() ?? '',
          supports,
          i,
        );
      });
    });
    return witnessesOf(row.id);
  });

  // Autosave of the five sections. `updated_at` is the value the client last saw; a different
  // server value means another tab saved first (RF-012), so nothing is written and the current
  // server text is returned for the client to reload.
  app.patch('/cases/:id/doc', (req, reply) => {
    const { id } = req.params as { id: string };
    const row = caseById(id);
    if (!row) return reply.code(404).send({ error: 'not found' });
    const body = (req.body ?? {}) as Partial<Record<Section, string>> & { updated_at?: string };
    if (!body.updated_at) return reply.code(400).send({ error: 'updated_at is required' });

    const sent = SECTIONS.filter((s) => body[s] !== undefined);
    if (sent.some((s) => typeof body[s] !== 'string' || body[s]!.length > MAX_TEXT)) {
      return reply.code(400).send({ error: 'invalid section text' });
    }
    if (body.updated_at !== row.updated_at) {
      return reply.code(409).send({ error: 'stale', ...(docOf(row.id) as object) });
    }
    if (sent.length === 0) return { updated_at: row.updated_at };

    const updatedAt = new Date().toISOString();
    const sets = sent.map((s) => `${s} = ?`).join(', ');
    db.prepare(`UPDATE protest_case SET ${sets}, updated_at = ? WHERE id = ?`).run(
      ...sent.map((s) => body[s] as string),
      updatedAt,
      row.id,
    );
    return { updated_at: updatedAt };
  });
}
