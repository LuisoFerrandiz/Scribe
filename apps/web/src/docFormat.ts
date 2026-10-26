import { SECTION_KEYS, SECTION_LABEL, type CaseFull, type PartyRow, type Sections } from './types';

// RF-009: plain text for pasting into the official form and for the .txt backup.

const ROLE_LABEL: Record<PartyRow['role'], string> = {
  protestor: 'Protestor',
  respondent: 'Respondent',
  other: 'Party',
};
const KIND_LABEL: Record<string, string> = { protest: 'Protest', redress: 'Redress', reopening: 'Reopening' };

// "Protestor: Ana Beltran, Wind Chaser, ESP 12" — empty parts are left out.
export function partyLine(p: PartyRow): string {
  const data = [p.name, p.boat_name, p.sail_number].filter(Boolean).join(', ');
  return `${ROLE_LABEL[p.role]}: ${data || '-'}`;
}

export function partiesBlock(c: CaseFull): string {
  return c.parties.map(partyLine).join('\n');
}

export function headerBlock(c: CaseFull): string {
  const kinds = c.kinds.split(',').map((k) => KIND_LABEL[k] ?? k).join(' + ');
  const when = c.hearing_at ? ` - ${c.hearing_at.replace('T', ' ')}` : '';
  const lines = [`Case ${c.case_number} - ${c.event_name}`, `${kinds}${when}`];
  const parties = partiesBlock(c);
  if (parties) lines.push('', parties);
  if (c.witnesses.length > 0) lines.push('', `Witnesses: ${c.witnesses.map((w) => w.name || '-').join(', ')}`);
  return lines.join('\n');
}

export function fullText(c: CaseFull, sections: Sections): string {
  const body = SECTION_KEYS.map((k) => `${SECTION_LABEL[k]}\n${sections[k].trim()}`).join('\n\n');
  return `${headerBlock(c)}\n\n${body}\n`;
}

export function fileName(c: CaseFull): string {
  const safe = c.case_number.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || String(c.id);
  return `case-${safe}.txt`;
}

export function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// navigator.clipboard needs a secure context, and the app runs on plain HTTP on the LAN, so
// fall back to a temporary textarea and execCommand. The focused element is put back afterwards.
export async function copyText(text: string): Promise<boolean> {
  try {
    if (window.isSecureContext && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  const previous = document.activeElement as HTMLElement | null;
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  previous?.focus();
  return ok;
}
