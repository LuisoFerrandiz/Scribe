import type { CaseFull, Sections } from './types';

// Local safety net (RF-003): the text is written here on every keystroke, before the server
// sees it. Every access is wrapped: storage can be blocked, full or absent.

export interface Draft {
  sections: Sections;
  base: string; // server updated_at this text was written on top of
  dirty: boolean; // true while the server may not have this text yet
}

const draftKey = (caseId: number) => `scribe.draft.${caseId}`;
const copyKey = (caseId: number) => `scribe.copy.${caseId}`;
const caseKey = (caseId: number) => `scribe.case.${caseId}`;

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the server save is still the main path */
  }
}

export const readDraft = (caseId: number) => read<Draft>(draftKey(caseId));
export const writeDraft = (caseId: number, draft: Draft) => write(draftKey(caseId), draft);

// Text replaced by a newer server version (two tabs, RF-012); kept so nothing is lost.
export const readCopy = (caseId: number) => read<Sections>(copyKey(caseId));
export const writeCopy = (caseId: number, sections: Sections) => write(copyKey(caseId), sections);
export function clearCopy(caseId: number) {
  try {
    window.localStorage.removeItem(copyKey(caseId));
  } catch {
    /* ignore */
  }
}

// Last case data loaded from the server, so the page can reopen with no network.
export const readCachedCase = (caseId: number) => read<CaseFull>(caseKey(caseId));
export const writeCachedCase = (c: CaseFull) => write(caseKey(c.id), c);
