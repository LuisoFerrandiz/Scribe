export type Role = 'protestor' | 'respondent' | 'other';
export type Kind = 'protest' | 'redress' | 'reopening';

export type SectionKey = 'procedural' | 'facts' | 'conclusion' | 'rules_text' | 'decision';
export type Sections = Record<SectionKey, string>;

export const SECTION_KEYS: SectionKey[] = ['procedural', 'facts', 'conclusion', 'rules_text', 'decision'];
export const SECTION_LABEL: Record<SectionKey, string> = {
  procedural: 'Procedural Matters',
  facts: 'Facts Found',
  conclusion: 'Conclusion',
  rules_text: 'Rules Applicable',
  decision: 'Decision',
};

export interface SessionUser {
  id: number;
  username: string;
  role: 'admin' | 'user';
}

export interface EventRow {
  id: number;
  name: string;
  timezone: string;
}

export interface PartyRow {
  id: number;
  role: Role;
  name: string;
  boat_name: string;
  sail_number: string;
}

export interface WitnessRow {
  id: number;
  name: string;
  supports_party_id: number | null;
}

export interface CaseSummary {
  id: number;
  event_id: number;
  event_name: string;
  case_number: string;
  kinds: string; // comma-separated Kind values
  hearing_at: string | null;
  updated_at: string;
}

export interface CaseFull extends CaseSummary {
  procedural: string;
  facts: string;
  conclusion: string;
  rules_text: string;
  decision: string;
  event_timezone: string;
  parties: PartyRow[];
  witnesses: WitnessRow[];
}

export interface NewCaseInput {
  event_id: number;
  case_number: string;
  kinds: Kind[];
  hearing_at: string | null;
  parties: { role: Role; name: string; boat_name: string; sail_number: string }[];
}

export interface AttachmentRow {
  id: number;
  original_filename: string;
  conversion_empty: 0 | 1;
  uploaded_at: string;
}

// Proposal read from the protest form(s); nothing is saved until the scribe accepts it.
export interface Extraction {
  case_number: string;
  claim_types: Kind[];
  parties: { role: Role; name: string; boat_name: string; sail_number: string }[];
}

export type Suggestion =
  | { kind: 'phrase'; id: number; label: string; body: string }
  | { kind: 'rule'; citation: string; heading: string; doc_title: string; typed: boolean };

export interface SearchPhrase {
  id: number;
  box: string;
  label: string;
  body: string;
}

export interface SearchRule {
  section_id: number;
  citation: string | null; // null: event document not classified, cannot be cited
  heading: string;
  doc_title: string;
  source: 'rrs' | 'event';
  excerpt: string;
}

export interface SearchResponse {
  phrases: SearchPhrase[];
  rrs: SearchRule[];
  event: SearchRule[];
}

export interface SuggestResponse {
  phrase: { id: number; label: string; body: string } | null;
  rule: { citation: string; heading: string; doc_title: string; typed?: boolean } | null;
}

// Event documents (NoR, SIs, class rules and their amendments): uploaded, reviewed, then searchable.
export type DocType = 'nor' | 'si' | 'class' | 'nor_amendment' | 'si_amendment' | 'class_amendment';

export interface ResourceRow {
  id: number;
  kind: 'rule' | 'example';
  layer: 'rrs' | 'class' | 'event' | null;
  event_id: number | null;
  title: string;
  original_filename: string;
  status: 'pending_review' | 'accepted';
  conversion_empty: 0 | 1;
  doc_type: DocType | null;
  created_at: string;
}

export interface ResourceDetail extends ResourceRow {
  sectionsPreview: { count: number; sample: string[] } | null;
}
