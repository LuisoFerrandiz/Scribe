import { SECTION_KEYS, SECTION_LABEL, type CaseFull, type PartyRow, type Sections } from './types';

// RF-009: plain text for pasting into the official form.

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

// "5" -> "Race 5"; a race the form wrote with its own words ("Race 3", "R3") is left as it is; none -> "".
export function raceLabel(race: string): string {
  const r = race.trim();
  return /^\d/.test(r) ? `Race ${r}` : r;
}

// "Case 7 - Test Cup" and "Race 5 - Protest + Redress - 2026-10-25 18:30" (no race: no "Race" part, no gap).
export function titleLines(c: CaseFull): string[] {
  const kinds = c.kinds.split(',').map((k) => KIND_LABEL[k] ?? k).join(' + ');
  const when = c.hearing_at ? ` - ${c.hearing_at.replace('T', ' ')}` : '';
  const race = raceLabel(c.race ?? '');
  return [`Case ${c.case_number} - ${c.event_name}`, `${race ? `${race} - ` : ''}${kinds}${when}`];
}

export const witnessLine = (c: CaseFull): string =>
  c.witnesses.length > 0 ? `Witnesses: ${c.witnesses.map((w) => w.name || '-').join(', ')}` : '';

export function headerBlock(c: CaseFull): string {
  const lines = titleLines(c);
  const parties = partiesBlock(c);
  if (parties) lines.push('', parties);
  const witnesses = witnessLine(c);
  if (witnesses) lines.push('', witnesses);
  return lines.join('\n');
}

export function fullText(c: CaseFull, sections: Sections): string {
  const body = SECTION_KEYS.map((k) => `${SECTION_LABEL[k]}\n${sections[k].trim()}`).join('\n\n');
  return `${headerBlock(c)}\n\n${body}\n`;
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
  let ok: boolean;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  previous?.focus();
  return ok;
}
