-- Scribe Helper v2 — SQLite schema (SPEC-001). Fresh database; no legacy tables.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS event (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One hearing. kinds: comma-separated subset of protest, redress, reopening.
-- hearing_at: local date-time in the event timezone ("YYYY-MM-DDTHH:MM").
-- The five document sections are plain text written by the scribe.
CREATE TABLE IF NOT EXISTS protest_case (
  id INTEGER PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  case_number TEXT NOT NULL,
  race TEXT NOT NULL DEFAULT '', -- race number as the protest form writes it ("5"); optional
  kinds TEXT NOT NULL DEFAULT 'protest',
  hearing_at TEXT,

  procedural TEXT NOT NULL DEFAULT '',
  facts TEXT NOT NULL DEFAULT '',
  conclusion TEXT NOT NULL DEFAULT '',
  rules_text TEXT NOT NULL DEFAULT '',
  decision TEXT NOT NULL DEFAULT '',

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (event_id, case_number)
);
CREATE INDEX IF NOT EXISTS idx_case_event ON protest_case(event_id);

-- Any number of parties per case. A party may have no data (did not attend).
CREATE TABLE IF NOT EXISTS party (
  id INTEGER PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES protest_case(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'other' CHECK (role IN ('protestor', 'respondent', 'other')),
  name TEXT NOT NULL DEFAULT '',
  boat_name TEXT NOT NULL DEFAULT '',
  sail_number TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_party_case ON party(case_id);

CREATE TABLE IF NOT EXISTS witness (
  id INTEGER PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES protest_case(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  supports_party_id INTEGER REFERENCES party(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_witness_case ON witness(case_id);

-- Protest forms uploaded against one case. Converted to Markdown on upload.
-- Not citable, not a style sample, not reusable wording.
CREATE TABLE IF NOT EXISTS case_attachment (
  id INTEGER PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES protest_case(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  original_path TEXT NOT NULL,
  markdown_path TEXT,
  conversion_empty INTEGER NOT NULL DEFAULT 0 CHECK (conversion_empty IN (0, 1)),
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_case_attachment_case ON case_attachment(case_id);

-- Reusable wording, tagged by the box it belongs to. The library has no
-- Rules Applicable box. Never presented as a rule.
CREATE TABLE IF NOT EXISTS phrase (
  id INTEGER PRIMARY KEY,
  box TEXT NOT NULL CHECK (box IN ('procedural_matters', 'facts_found', 'conclusion', 'decision')),
  label TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT 'own' CHECK (origin IN ('base', 'own')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_phrase_box ON phrase(box);
CREATE VIRTUAL TABLE IF NOT EXISTS phrase_fts USING fts5(
  label,
  body,
  phrase_id UNINDEXED,
  tokenize = 'porter unicode61'
);

-- Uploaded rule documents. The v1 uses rules only (RRS permanent, event documents
-- per regatta: NoR, SIs, class rules, amendments). kind 'example' is kept in the
-- CHECK because the copied resource routes still accept it; the v1 UI never uses it.
CREATE TABLE IF NOT EXISTS resource (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('rule', 'example')),
  layer TEXT CHECK (layer IN ('rrs', 'class', 'event')),
  event_id INTEGER REFERENCES event(id) ON DELETE CASCADE,
  scope TEXT CHECK (scope IN ('base', 'own')),
  title TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  original_path TEXT NOT NULL,
  markdown_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'accepted')),
  conversion_empty INTEGER NOT NULL DEFAULT 0 CHECK (conversion_empty IN (0, 1)),
  doc_type TEXT,
  sections_indexed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  CHECK (
    (kind = 'rule' AND layer IS NOT NULL AND scope IS NULL) OR
    (kind = 'example' AND scope IS NOT NULL AND layer IS NULL)
  ),
  CHECK ((layer = 'event') = (event_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_resource_kind_status ON resource(kind, status);
CREATE INDEX IF NOT EXISTS idx_resource_event ON resource(event_id);

CREATE VIRTUAL TABLE IF NOT EXISTS resource_fts USING fts5(
  title,
  body,
  resource_id UNINDEXED,
  tokenize = 'porter unicode61'
);

-- One row per numbered rule, so a citation can be taken from the corpus.
CREATE TABLE IF NOT EXISTS rule_section (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_id INTEGER NOT NULL REFERENCES resource(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  heading TEXT NOT NULL,
  body TEXT NOT NULL,
  part TEXT,
  position INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rule_section_resource ON rule_section(resource_id);
CREATE INDEX IF NOT EXISTS idx_rule_section_number ON rule_section(number);
CREATE VIRTUAL TABLE IF NOT EXISTS rule_section_fts USING fts5(
  heading,
  body,
  section_id UNINDEXED,
  tokenize = 'unicode61'
);

CREATE TABLE IF NOT EXISTS app_user (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
