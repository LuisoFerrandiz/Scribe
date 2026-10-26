import type { FastifyInstance } from 'fastify';
import { registerAuthRoutes } from './auth.js';
import { registerUserRoutes } from './users.js';
import { registerResourceRoutes } from './resources.js';
import { registerPhraseRoutes } from './phrases.js';
import { registerCaseAttachmentRoutes } from './caseAttachments.js';
import { registerEventRoutes } from './events.js';
import { registerCaseRoutes } from './cases.js';
import { registerSuggestRoutes } from './suggest.js';

// v1 (SPEC-001) routes.
export function registerRoutes(app: FastifyInstance) {
  registerAuthRoutes(app);
  registerUserRoutes(app);
  registerResourceRoutes(app);
  registerPhraseRoutes(app);
  registerCaseAttachmentRoutes(app);
  registerEventRoutes(app);
  registerCaseRoutes(app);
  registerSuggestRoutes(app);
}
