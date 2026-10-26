import { readFileSync } from 'node:fs';
import path from 'node:path';
import { db } from './connection.js';
import { syncPhrasesAtStart } from '../phrases/files.js';
import { PHRASES_DIR } from '../phrases/location.js';
import { seedAdminUser } from './seedAdmin.js';
import { seedRrs } from './seedRrs.js';
import { ensureColumns } from './columns.js';
import { config } from '../config.js';
import { indexPendingSections, reindexIfParserChanged } from '../resources/sectionIndex.js';

// Runs on every container start, so every step is idempotent. The schema is the
// whole v2 schema (fresh database); there are no ALTER migrations yet.
const schemaPath = path.join(import.meta.dirname, '..', '..', 'db', 'schema.sql');
db.exec(readFileSync(schemaPath, 'utf-8'));
console.log('Schema applied:', schemaPath);
ensureColumns(db, path.join(config.dataDir, 'db'));

await seedRrs();
await indexPendingSections();
await reindexIfParserChanged();
syncPhrasesAtStart(db, PHRASES_DIR);
seedAdminUser();
