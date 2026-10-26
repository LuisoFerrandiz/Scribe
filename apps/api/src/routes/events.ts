import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';

function validTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function registerEventRoutes(app: FastifyInstance) {
  app.get('/events', () => db.prepare('SELECT id, name, timezone FROM event ORDER BY id DESC').all());

  app.post('/events', (req, reply) => {
    const body = (req.body ?? {}) as { name?: string; timezone?: string };
    const name = body.name?.trim();
    const timezone = body.timezone?.trim() || 'UTC';
    if (!name) return reply.code(400).send({ error: 'name is required' });
    if (!validTimezone(timezone)) return reply.code(400).send({ error: 'invalid timezone' });
    const result = db.prepare('INSERT INTO event (name, timezone) VALUES (?, ?)').run(name, timezone);
    reply.code(201).send({ id: Number(result.lastInsertRowid), name, timezone });
  });
}
