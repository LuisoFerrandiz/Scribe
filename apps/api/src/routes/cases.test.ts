import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Fastify from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// The case routes against a real SQLite file in a temp folder (the schema is the production one).
// The auth guard is not registered here: it is covered by running the server.
const dataDir = mkdtempSync(path.join(os.tmpdir(), 'scribe-test-'));
process.env.DATA_DIR = dataDir;

let app: ReturnType<typeof Fastify>;
let eventId: number;

beforeAll(async () => {
  mkdirSync(path.join(dataDir, 'db'), { recursive: true });
  const { db } = await import('../db/connection.js');
  db.exec(readFileSync(path.join(import.meta.dirname, '..', '..', 'db', 'schema.sql'), 'utf-8'));
  const { registerEventRoutes } = await import('./events.js');
  const { registerCaseRoutes } = await import('./cases.js');
  app = Fastify();
  registerEventRoutes(app);
  registerCaseRoutes(app);
  await app.ready();
  const ev = await app.inject({ method: 'POST', url: '/events', payload: { name: 'Test Cup', timezone: 'Europe/Madrid' } });
  eventId = ev.json().id;
});

afterAll(async () => {
  await app.close();
  const { db } = await import('../db/connection.js');
  db.close();
  rmSync(dataDir, { recursive: true, force: true });
});

const newCase = (number: string) =>
  app.inject({
    method: 'POST',
    url: '/cases',
    payload: {
      event_id: eventId,
      case_number: number,
      kinds: ['protest'],
      parties: [{ role: 'protestor', name: 'Ana', sail_number: 'ESP 12' }, { role: 'respondent' }],
    },
  });

describe('events', () => {
  it('rejects an unknown time zone', async () => {
    const res = await app.inject({ method: 'POST', url: '/events', payload: { name: 'Bad', timezone: 'Mars/Base' } });
    expect(res.statusCode).toBe(400);
  });
});

describe('cases', () => {
  it('creates a case with its parties, and refuses a repeated number in the same event', async () => {
    const first = await newCase('1');
    expect(first.statusCode).toBe(201);
    expect(first.json().parties).toHaveLength(2);
    const again = await newCase('1');
    expect(again.statusCode).toBe(409);
  });

  it('refuses unknown kinds', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/cases',
      payload: { event_id: eventId, case_number: 'k', kinds: ['nope'] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('keeps party ids on update, so witnesses stay linked', async () => {
    const c = (await newCase('2')).json();
    const [ana] = c.parties;
    const put = await app.inject({
      method: 'PUT',
      url: `/cases/${c.id}/parties`,
      payload: { parties: [{ id: ana.id, role: 'protestor', name: 'Ana B' }, { role: 'other', name: 'Zed' }] },
    });
    const parties = put.json();
    expect(parties).toHaveLength(2);
    expect(parties[0].id).toBe(ana.id);
    expect(parties[0].name).toBe('Ana B');

    const wit = await app.inject({
      method: 'PUT',
      url: `/cases/${c.id}/witnesses`,
      payload: { witnesses: [{ name: 'W1', supports_party_id: ana.id }, { name: 'W2', supports_party_id: 99999 }] },
    });
    const ws = wit.json();
    expect(ws[0].supports_party_id).toBe(ana.id);
    expect(ws[1].supports_party_id).toBeNull(); // a party of another case is not accepted
  });

  it('accepts as many parties as a real case can have (1 protestor, 40 respondents)', async () => {
    const c = (await newCase('3')).json();
    const parties = [
      { role: 'protestor', name: 'P' },
      ...Array.from({ length: 40 }, (_, i) => ({ role: 'respondent', sail_number: `ESP ${100 + i}` })),
    ];
    const res = await app.inject({ method: 'PUT', url: `/cases/${c.id}/parties`, payload: { parties } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(41);
  });
});

describe('deleting a case', () => {
  it('removes the case, its people and its attached files', async () => {
    const c = (await newCase('del')).json();
    const { db } = await import('../db/connection.js');
    const dir = path.join(dataDir, 'case_attachments');
    mkdirSync(dir, { recursive: true });
    const original = path.join('case_attachments', 'form.pdf');
    const markdown = path.join('case_attachments', 'form.md');
    writeFileSync(path.join(dataDir, original), 'x');
    writeFileSync(path.join(dataDir, markdown), 'x');
    db.prepare('INSERT INTO case_attachment (case_id, original_filename, original_path, markdown_path) VALUES (?, ?, ?, ?)').run(
      c.id,
      'form.pdf',
      original,
      markdown,
    );

    const res = await app.inject({ method: 'DELETE', url: `/cases/${c.id}` });
    expect(res.statusCode).toBe(204);
    expect((await app.inject({ url: `/cases/${c.id}` })).statusCode).toBe(404);
    expect(db.prepare('SELECT COUNT(*) AS n FROM party WHERE case_id = ?').get(c.id)).toMatchObject({ n: 0 });
    expect(db.prepare('SELECT COUNT(*) AS n FROM case_attachment WHERE case_id = ?').get(c.id)).toMatchObject({ n: 0 });
    expect(existsSync(path.join(dataDir, original))).toBe(false);
    expect(existsSync(path.join(dataDir, markdown))).toBe(false);
  });

  it('answers 404 for a case that does not exist', async () => {
    expect((await app.inject({ method: 'DELETE', url: '/cases/999999' })).statusCode).toBe(404);
  });
});

describe('document autosave (two tabs)', () => {
  it('saves against the last known stamp, and answers 409 with the server text when it is stale', async () => {
    const c = (await newCase('4')).json();
    const stamp = c.updated_at;

    const a = await app.inject({ method: 'PATCH', url: `/cases/${c.id}/doc`, payload: { updated_at: stamp, facts: 'from tab A' } });
    expect(a.statusCode).toBe(200);
    const next = a.json().updated_at;
    expect(next).not.toBe(stamp);

    // Tab B still has the first stamp.
    const b = await app.inject({ method: 'PATCH', url: `/cases/${c.id}/doc`, payload: { updated_at: stamp, facts: 'from tab B' } });
    expect(b.statusCode).toBe(409);
    expect(b.json().facts).toBe('from tab A');
    expect(b.json().updated_at).toBe(next);

    // Nothing of B was written.
    const now = (await app.inject({ url: `/cases/${c.id}` })).json();
    expect(now.facts).toBe('from tab A');
  });

  it('changes only the sections it is sent', async () => {
    const c = (await newCase('5')).json();
    const one = await app.inject({ method: 'PATCH', url: `/cases/${c.id}/doc`, payload: { updated_at: c.updated_at, facts: 'F' } });
    await app.inject({
      method: 'PATCH',
      url: `/cases/${c.id}/doc`,
      payload: { updated_at: one.json().updated_at, decision: 'D' },
    });
    const now = (await app.inject({ url: `/cases/${c.id}` })).json();
    expect(now.facts).toBe('F');
    expect(now.decision).toBe('D');
  });
});
