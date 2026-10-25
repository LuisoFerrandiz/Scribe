# SPEC-001 — Plan técnico (v2, tras revisión QA)

TypeScript, Fastify, SQLite + FTS5, React + Vite, Docker. Base: lista cerrada copiada del old
(`C:\Users\luiso\Proyectos\Scribe_helper_old`); lo demás se escribe nuevo.

## Copiar tal cual

- `apps/api`: `package.json`, `tsconfig.json`, `Dockerfile`, `src/config.ts`, `src/db/` (conexión,
  transaction, seedAdmin, seedPhrases), `src/auth/`, `src/resources/` (conversión y secciones de
  reglas), `src/phrases/`, `src/case-attachments/storage.ts`, `seed/preferred-standard-wording.xlsx`.
- `apps/api/src/routes/`: `auth.ts`, `users.ts`, `resources.ts`, `phrases.ts`, `caseAttachments.ts`.
- `apps/web`: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `Dockerfile`,
  `nginx.conf`, `docker-entrypoint.d/` (el nginx depende de `40-scribe-config.sh`).
- Datos: `data/rules/rrs` (RRS, material permanente) y la semilla de frases. **Nada más**: ni BD, ni
  `data/originals` con decisiones reales, ni `data/examples`, ni `data/case_attachments`, ni material de
  eventos concretos (Paris 2024, clase SB20). Para probar eventos, el escribano sube NoR/SI por la UI.

## Copiar y recortar

- `rules/sectionQuery.ts`: solo la consulta por texto sobre secciones. **No** `rules/factsQuery.ts` ni las
  rutas `/rules/suggest` y `/rules/check` (avisos de referencias, fuera de v1). Del `routes/rules.ts`
  se conserva solo la búsqueda.
- `apps/api/db/schema.sql`: se quitan jury, case_link, case_rule_citation y columnas `*_at` de la cadena.

## Reescribir (no copiar)

- `server.ts` y `routes/index.ts` (arrastran fillGaps, draft, complete, proposals, caseLinks, etc.).
- `routes/crud.ts` y el modelo de caso: el old tiene `party.role` solo initiator/respondent con FK a
  `boat`/`person`; el nuevo `party` es plano (role, name, boat_name, sail_number, position) y
  `witness` (name, supports_party_id). Se eliminan `boat` y `person`.
- `ai/extract.ts`: nuevo prompt y tipo mínimo `{ case_number, claim_types, parties[{role,name,boat,sail}] }`.
  Ruta `POST /cases/:id/extract`. Verificar el modelo y el SDK vigentes en el momento de implementar.
- Todo `apps/web/src` (vista de caso nueva).

## Descartar

`ai/complete.ts`, `proposals.ts`, `fillGaps.ts`, `draft.ts`, `exampleSuggestions.ts` y sus rutas;
en web todo lo de propuestas, huecos, desfase y pestañas.

## Modelo de datos

- `event`(id, name, timezone) — se crea/elige al dar de alta el caso.
- `protest_case`(id, event_id, case_number, kinds, hearing_at, procedural, facts, conclusion,
  rules_text, decision, updated_at; UNIQUE(event_id, case_number)).
- `party`, `witness` como arriba. `phrase` mantiene sus 4 cajas (no hay caja Rules Applicable).
- `resource`/`rule_section`/FTS, `app_user`, `app_meta` se mantienen. Clase = documento de evento con
  `doc_type='class'` (la capa `class/` es legado).

## API nueva

- `GET/POST/PATCH /cases`, `GET /cases/:id` (con partes y testigos), `PATCH /cases/:id/doc` con
  `updated_at` (409 si el servidor es más nuevo), `POST/PATCH/DELETE` de partes y testigos.
- `GET /suggest?q=&box=`: una frase (solo cajas con frases) y una cita; umbrales de RF-005 en el servidor.
  Consulta FTS por separado en `phrase_fts` y `rule_section_fts` (bm25 no es comparable entre tablas;
  se aplica el umbral de palabras compartidas, no de puntuación).
- `GET /search?q=`: hasta 5 resultados por fuente (frases, RRS, documentos de evento), con tipo y documento.
- `POST /cases/:id/attachments`, `POST /cases/:id/extract` (propuesta), `POST /cases/:id/parties` confirma.

## Frontend nuevo

`CaseList`, `NewCase`, `CaseView` (cabecera + 5 `Section` + línea de sugerencia + estado de guardado),
`SearchDialog` (Ctrl+K), `ReadingView` (F2). Lógica en helpers (`caseData.ts`, `suggestQuery.ts`,
`dataMatch.ts`, `docFormat.ts`, `draftStore.ts`). Textareas simples con `spellcheck lang="en"`; guarda
sección, `selectionStart` y `selectionEnd` al abrir diálogos o F2. Tab se intercepta solo con sugerencia visible.

## Despliegue

Repo GitHub nuevo (lo crea el dueño). Variables `API_PORT=3001`, `WEB_HTTP_PORT=8087`; volumen
`/DATA/Proyectos/Scribe_helper_v2/data`. `.env.example` con ADMIN_USERNAME, ADMIN_PASSWORD,
SESSION_SECRET, ANTHROPIC_API_KEY (solo extracción), TZ, DATA_DIR. La clave vive en el stack, no en git.

## Riesgos

- Copiar de más trae complejidad: lista cerrada; cada archivo copiado queda en `DECISIONS.md`.
- Ortografía con términos de vela marcados: aceptado (RF-007).
- Detección de "situación" imperfecta: `Ctrl+K` es la red.
- Sugerencia que distraiga: se mide en la audiencia real; el cambio se decide después, no antes.

## Verificación

`npm run build` (api) y `npm run typecheck` (web) limpios; verificación local con BD de prueba y los
criterios 1-7; despliegue y verificación en vivo; prueba en audiencia real (criterio 8).
