// RF-002: the only thing the model returns. A proposal for the scribe to review; this module
// never writes to the case and never fills a document section.
export interface Extraction {
  case_number: string;
  race: string; // as the form writes it; several distinct races comma separated; empty if none
  claim_types: ('protest' | 'redress' | 'reopening')[];
  parties: { role: 'protestor' | 'respondent' | 'other'; name: string; boat_name: string; sail_number: string }[];
}

// Thrown with a status the route passes on: 503 no key, 422 nothing to read, 502 model failure.
export class ExtractError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const MAX_PARTIES = 200;
const MAX_RACE = 40;

// "5, 5, 5" -> "5": each distinct race once, in the order seen, and never longer than the case field.
export function cleanRaces(v: unknown): string {
  if (typeof v !== 'string') return '';
  const seen = [...new Set(v.split(',').map((r) => r.trim()).filter(Boolean))];
  return seen.join(', ').slice(0, MAX_RACE).trim();
}

function parseJson(text: string): unknown {
  const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start === -1 || end <= start) throw new ExtractError(502, 'AI extraction returned no valid JSON.');
    try {
      return JSON.parse(unfenced.slice(start, end + 1));
    } catch {
      throw new ExtractError(502, 'AI extraction returned no valid JSON.');
    }
  }
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const KINDS = ['protest', 'redress', 'reopening'] as const;
const ROLES = ['protestor', 'respondent', 'other'] as const;

// Whatever the model sent is reduced to the known shape: unknown roles and kinds are dropped,
// empty parties are not proposed, and the list is capped.
export function normalize(text: string): Extraction {
  const raw = parseJson(text);
  const obj = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const kinds = Array.isArray(obj.claim_types) ? obj.claim_types : [];
  const parties = Array.isArray(obj.parties) ? obj.parties : [];
  return {
    case_number: str(obj.case_number),
    race: cleanRaces(obj.race),
    claim_types: KINDS.filter((k) => kinds.includes(k)),
    parties: parties
      .flatMap((p) => {
        if (typeof p !== 'object' || p === null) return [];
        const r = p as Record<string, unknown>;
        const role = ROLES.find((x) => x === r.role) ?? 'other';
        const party = { role, name: str(r.name), boat_name: str(r.boat_name), sail_number: str(r.sail_number) };
        return party.name || party.boat_name || party.sail_number ? [party] : [];
      })
      .slice(0, MAX_PARTIES),
  };
}
