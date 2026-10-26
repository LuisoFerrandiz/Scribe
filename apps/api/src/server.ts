import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import cookie from '@fastify/cookie';
import { config } from './config.js';
import { registerRoutes } from './routes/index.js';
import { registerAuthGuard } from './auth/guard.js';
import path from 'node:path';
import { ensureColumns } from './db/columns.js';
import { db } from './db/connection.js';
import { syncPhrasesAtStart } from './phrases/files.js';
import { PHRASES_DIR } from './phrases/location.js';

// A database made before a column existed gets it now, on the same connection the API uses.
ensureColumns(db, path.join(config.dataDir, 'db'));
// The base phrases are the .md files the owner edits; the database follows them (SPEC-006).
syncPhrasesAtStart(db, PHRASES_DIR, (m) => console.log(m));

const app = Fastify({ logger: true });

// This server exists so the model API key never reaches the browser.
// credentials: true (plus origin echoed, not '*') so the session cookie
// survives the web app and API being on different ports/origins.
await app.register(cors, { origin: true, credentials: true });

// @fastify/cookie only parses/sets cookies; the session itself is a signed value
// (src/auth/session.ts). Not @fastify/secure-session: its native dependency does not
// match this image's musl libc and crash-looped the container.
await app.register(cookie);

registerAuthGuard(app);

// Rule and protest-form uploads: 50MB covers a full RRS PDF; scanned PDFs are out of scope (no OCR).
await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });

app.get('/health', () => ({ status: 'ok' }));

registerRoutes(app);

app.listen({ host: config.host, port: config.port }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
