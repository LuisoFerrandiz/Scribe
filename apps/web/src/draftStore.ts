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

// A deleted case leaves nothing behind on this device.
export function clearCaseLocal(caseId: number) {
  try {
    for (const key of [draftKey(caseId), copyKey(caseId), caseKey(caseId)]) window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// Comfort preference, never critical state: the case panel folded or not (SPEC-003). Any failure
// means "show the panel".
const RAIL_KEY = 'scribe.rail';
export function readRailCollapsed(): boolean {
  try {
    return window.localStorage.getItem(RAIL_KEY) === 'collapsed';
  } catch {
    return false;
  }
}
export function writeRailCollapsed(collapsed: boolean) {
  try {
    if (collapsed) window.localStorage.setItem(RAIL_KEY, 'collapsed');
    else window.localStorage.removeItem(RAIL_KEY);
  } catch {
    /* storage unavailable: the choice lasts until the page is closed */
  }
}
