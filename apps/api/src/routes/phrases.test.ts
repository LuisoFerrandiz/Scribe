import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Fastify from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// The phrase reload routes against a real SQLite file and real .md files in a temp folder.
// The session guard is replaced by a hook that sets the role the test asks for in a header.
const dataDir = mkdtempSync(path.join(os.tmpdir(), 'scribe-phr-routes-'));
process.env.DATA_DIR = dataDir;
const phrasesDir = path.join(dataDir, 'phrases', 'base');

let app: ReturnType<typeof Fastify>;
const as = (role: string) => ({ 'x-role': role });
const write = (text: string) => writeFileSync(path.join(phrasesDir, 'c.md'), text, 'utf-8');

beforeAll(async () => {
  mkdirSync(path.join(dataDir, 'db'), { recursive: true });
  mkdirSync(phrasesDir, { recursive: true });
  const { db } = await import('../db/connection.js');
  db.exec(readFileSync(path.join(import.meta.dirname, '..', '..', 'db', 'schema.sql'), 'utf-8'));
  const { registerPhraseRoutes } = await import('./phrases.js');
  app = Fastify();
  app.decorateRequest('currentUser', null);
  app.addHook('onRequest', async (req) => {
    const role = req.headers['x-role'];
    (req as unknown as { currentUser: unknown }).currentUser = role ? { id: 1, username: 't', role } : null;
  });
  registerPhraseRoutes(app);
  await app.ready();
});

afterAll(async () => {
  await app.close();
  const { db } = await import('../db/connection.js');
  db.close();
  rmSync(dataDir, { recursive: true, force: true });
});

describe('phrase reload routes (SPEC-006)', () => {
  it('only the administrator can look at the status or reload', async () => {
    write('box: conclusion\n### A\none\n');
    expect((await app.inject({ method: 'GET', url: '/phrases/status', headers: as('user') })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/phrases/reload', headers: as('user') })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/phrases/reload' })).statusCode).toBe(403);
  });

  it('reports the files, loads them, and then reports no difference', async () => {
    write('box: conclusion\n### A\none\n### B\ntwo\n');
    const status = await app.inject({ method: 'GET', url: '/phrases/status', headers: as('admin') });
    expect(status.json()).toMatchObject({ total: 2, differs: true, added: 2, removed: 0, files: [{ file: 'c.md', count: 2 }] });

    const reload = await app.inject({ method: 'POST', url: '/phrases/reload', headers: as('admin') });
    expect(reload.statusCode).toBe(200);
    expect(reload.json()).toEqual({ total: 2, added: 2, removed: 0, changed: true });

    const again = await app.inject({ method: 'GET', url: '/phrases/status', headers: as('admin') });
    expect(again.json()).toMatchObject({ differs: false });
    const found = await app.inject({ method: 'GET', url: '/phrases/search?q=two', headers: as('admin') });
    expect(found.json()).toHaveLength(1);
  });

  it('answers 422 with file, line and reason for a broken file, and keeps the phrases it had', async () => {
    write('box: nothing\n### A\none\n');
    const r = await app.inject({ method: 'POST', url: '/phrases/reload', headers: as('admin') });
    expect(r.statusCode).toBe(422);
    expect(r.json().errors[0]).toMatchObject({ file: 'c.md', line: 1 });
    const all = await app.inject({ method: 'GET', url: '/phrases', headers: as('admin') });
    expect(all.json()).toHaveLength(2);
  });
});
