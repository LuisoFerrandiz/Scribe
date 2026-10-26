import path from 'node:path';
import { config } from '../config.js';

// Where the base phrase files live (SPEC-006): under the data folder, like everything else.
export const PHRASES_DIR = path.join(config.dataDir, 'phrases', 'base');
