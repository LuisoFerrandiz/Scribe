import { afterEach, describe, expect, it, vi } from 'vitest';
import { readRailCollapsed, writeRailCollapsed } from './draftStore';

// The tests run in Node: a window with a small localStorage stands in for the browser's.
function fakeWindow(storage: Record<string, string> = {}, broken = false) {
  const localStorage = {
    getItem: (k: string) => {
      if (broken) throw new Error('blocked');
      return k in storage ? storage[k] : null;
    },
    setItem: (k: string, v: string) => {
      if (broken) throw new Error('blocked');
      storage[k] = v;
    },
    removeItem: (k: string) => {
      if (broken) throw new Error('blocked');
      delete storage[k];
    },
  };
  vi.stubGlobal('window', { localStorage });
  return storage;
}

afterEach(() => vi.unstubAllGlobals());

describe('case panel preference (SPEC-003)', () => {
  it('shows the panel by default', () => {
    fakeWindow();
    expect(readRailCollapsed()).toBe(false);
  });

  it('remembers a folded panel and an unfolded one', () => {
    fakeWindow();
    writeRailCollapsed(true);
    expect(readRailCollapsed()).toBe(true);
    writeRailCollapsed(false);
    expect(readRailCollapsed()).toBe(false);
  });

  it('shows the panel, without failing, when the storage is blocked', () => {
    fakeWindow({}, true);
    expect(readRailCollapsed()).toBe(false);
    expect(() => writeRailCollapsed(true)).not.toThrow();
  });
});
