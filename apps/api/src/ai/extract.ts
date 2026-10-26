import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/connection.js';
import { readMarkdown } from '../resources/storage.js';

// RF-002: the only thing the model returns. A proposal for the scribe to review; this module
// never writes to the case and never fills a document section.
export interface Extraction {
  case_number: string;
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

const MODEL = process.env.EXTRACT_MODEL ?? 'claude-sonnet-5-5';
const MAX_PARTIES = 200;

const SYSTEM =
  'You read race protest forms for a protest committee scribe. Use only what the form(s) state: ' +
  'never invent a person, boat, sail number or case number. A sail number always keeps its country ' +
  'letters, e.g. "ESP 12", exactly as the form gives it. boat_name is only a vessel name: a ' +
  'person\'s name is never a boat_name. Roles: "protestor" files the protest, "respondent" is ' +
  'protested against, "other" is any further boat involved. A form that names no clear party gives ' +
  'an empty parties list. claim_types: "protest", "redress" or "reopening", only those the form ' +
  'asks for. Omit nothing you can read, add nothing you cannot. ' +
  'Return ONLY a JSON object, no markdown fence, no explanation.';

const SHAPE = JSON.stringify(
  {
    case_number: 'string, "" if the form has none',
    claim_types: ['protest'],
    parties: [{ role: 'protestor', name: 'string', boat_name: 'string', sail_number: 'string' }],
  },
  null,
  2,
);

export async function extractFromAttachments(caseId: number): Promise<Extraction> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new ExtractError(503, 'AI extraction is not configured on the server. Enter the data by hand.');

  const rows = db
    .prepare('SELECT original_filename, markdown_path FROM case_attachment WHERE case_id = ? ORDER BY id')
    .all(caseId) as { original_filename: string; markdown_path: string | null }[];
  const readable = rows.filter((r) => r.markdown_path);
  if (readable.length === 0) throw new ExtractError(422, 'No protest form with readable text is attached to this case.');

  const bodies = await Promise.all(
    readable.map(async (r) => `--- ${r.original_filename} ---\n${await readMarkdown(r.markdown_path!)}`),
  );
  const prompt = [
    'Extract the case number, claim types and parties from these protest form(s).',
    '',
    ...bodies,
    '',
    `Return JSON of exactly this shape:\n${SHAPE}`,
  ].join('\n');

  let text: string;
  try {
    const message = await new Anthropic({ apiKey }).messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });
    text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
  } catch (err) {
    throw new ExtractError(502, `AI extraction failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  return normalize(text);
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
