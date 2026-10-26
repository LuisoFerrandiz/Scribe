import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/connection.js';
import { readMarkdown } from '../resources/storage.js';
import { ExtractError, normalize, type Extraction } from './normalize.js';

const MODEL = process.env.EXTRACT_MODEL ?? 'claude-sonnet-5-5';

const SYSTEM =
  'You read race protest forms for a protest committee scribe. Use only what the form(s) state: ' +
  'never invent a person, boat, sail number or case number. A sail number always keeps its country ' +
  'letters, e.g. "ESP 12", exactly as the form gives it. boat_name is only a vessel name: a ' +
  'person\'s name is never a boat_name. Roles: "protestor" files the protest, "respondent" is ' +
  'protested against, "other" is any further boat involved. A form that names no clear party gives ' +
  'an empty parties list. claim_types: "protest", "redress" or "reopening", only those the form ' +
  'asks for. Omit nothing you can read, add nothing you cannot. ' +
  'race is the race number the form states (its "Race No." or similar), exactly as written; when several forms ' +
  'state different races list each one once, comma separated; empty when the form states none, never a guess. ' +
  'witnesses are the people the form names as witnesses, names only, as written; an empty list when the form names none, never a guess. ' +
  'Return ONLY a JSON object, no markdown fence, no explanation.';

const SHAPE = JSON.stringify(
  {
    case_number: 'string, "" if the form has none',
    race: 'string, the race number the form states ("Race No."), "" if none',
    claim_types: ['protest'],
    parties: [{ role: 'protestor', name: 'string', boat_name: 'string', sail_number: 'string' }],
    witnesses: ['string, a witness name'],
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
    'Extract the case number, race, claim types, parties and witnesses from these protest form(s).',
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
