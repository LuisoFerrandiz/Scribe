import type { FastifyInstance } from 'fastify';
import { registerAuthRoutes } from './auth.js';
import { registerUserRoutes } from './users.js';
import { registerResourceRoutes } from './resources.js';
import { registerPhraseRoutes } from './phrases.js';
import { registerCaseAttachmentRoutes } from './caseAttachments.js';

// v1 (SPEC-001): case, party, document, suggest and search routes are added in T4/T5.
export function registerRoutes(app: FastifyInstance) {
  registerAuthRoutes(app);
  registerUserRoutes(app);
  registerResourceRoutes(app);
  registerPhraseRoutes(app);
  registerCaseAttachmentRoutes(app);
}
