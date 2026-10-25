# DECISIONS

Solo se añade, no se edita el historial.

## D-001 — Reinicio del proyecto desde el uso real (2026-10-25)

**Contexto.** El dueño usó la v1 en un evento real y no pudo usarla: demasiada complejidad y capas, el
objetivo se perdió. El dueño es el escribano y redacta en vivo; su atención está en la audiencia.

**Decisión.** Proyecto nuevo, simple, con la base reutilizada por lista cerrada. v1 = datos a mano,
una línea de sugerencia determinista, buscador `Ctrl+K`, documento continuo, modo lectura y ortografía
del navegador. Sin IA de redacción en la v1.

**Alternativas.** (a) Recortar el repo actual: descartada, las capas se apoyan unas en otras y el hábito de
specs que causó la deriva seguía. (b) Empezar de cero total: descartada, la ingestión, el corpus y las
frases ya funcionan. (c) Mantener el fantasma de IA en la v1: descartada por simplicidad; se reevalúa tras
probar en una audiencia real.

**Consecuencias.** El old queda congelado en `Scribe_helper_old` y en producción. Todo lo que se copie
se anota aquí.

## D-002 — Base copiada del proyecto anterior (2026-10-25)

**Decisión.** T1 de SPEC-001 copia de `Scribe_helper_old`, sin tocar su lógica: en `apps/api`
`package.json`, `package-lock.json`, `tsconfig.json`, `Dockerfile`, `src/config.ts`, `src/db/`
(connection, transaction, seedAdmin, seedPhrases), `src/auth/`, `src/resources/`, `src/phrases/`,
`src/case-attachments/storage.ts`, `src/rules/citation.ts`, rutas `auth`, `users`, `resources`, `phrases`,
`caseAttachments` y `seed/preferred-standard-wording.xlsx`; en `apps/web` los ficheros de configuración,
`Dockerfile`, `nginx.conf` y `docker-entrypoint.d/40-scribe-config.sh`; datos `data/rules/rrs` y
`data/phrases/base`; `docker-compose.yml` con volumen `/DATA/Proyectos/Scribe_helper_v2/data` y puertos
3001/8087. `constitution.md` se escribe recortado. Quedan para T2/T3: `migrate.ts`, `schema.sql`,
`server.ts`, `routes/index.ts`, `crud.ts`, `rules` (búsqueda).

**Por qué `rules/citation.ts`.** `resources/ruleSections.ts` y `routes/resources.ts` lo importan; no se
añadió a la lista original del plan y la revisión de tipos lo detectó.

**Estado del build tras T1.** Quedan errores de tipos solo por las extensiones de Fastify (`cookies`,
`setCookie`, `isMultipart`, `parts`): se resuelven al registrar los plugins en el `server.ts` nuevo (T3).

## D-003 — Esquema nuevo y RRS sembrado (2026-10-25, T2)

**Decisión.** `apps/api/db/schema.sql` se reescribe desde cero: `event`, `protest_case` (cinco secciones en texto
plano, `kinds`, `hearing_at`), `party` (rol protestor/respondent/other, nombre, barco, vela), `witness`, más las
tablas copiadas de frases, recursos, secciones de reglas, adjuntos, usuarios y meta. Sin jurado, vínculos entre
casos, citas de caso, `boat` ni `person`. `migrate.ts` ya no tiene `ALTER` ni migración de reglas de clase.

**RRS sembrado.** Una BD nueva no tiene filas `resource` aunque existan los `.md`; `src/db/seedRrs.ts` registra
los dos documentos RRS (públicos) como aceptados y los indexa. Se copian a `data/originals` solo sus dos PDF.

**Verificado.** BD vacía en el scratchpad: 2 recursos, 578 secciones (FTS = 578), 333 frases (FTS = 333), admin
creado, `integrity_check ok`, segunda ejecución sin cambios.

## D-004 — Servidor mínimo y reglas recortadas (2026-10-25, T3)

**Decisión.** `routes/index.ts` se reescribe y registra solo auth, usuarios, recursos, frases y adjuntos de
caso; `server.ts` se copia con los comentarios limpiados. De `rules/` se conserva `citation.ts` y
`sectionQuery.ts` (sin `normalizeStoredReference`); no se copian `factsQuery.ts` ni `routes/rules.ts` (la
búsqueda de reglas se escribe nueva en T5). Se borra `resources/migrateClassRules.ts` (sin uso en una BD nueva).

**Verificado.** `npm run build` limpio. Servidor local con BD de prueba: `/health` ok, login, búsqueda de
frases (`withdrawn` en `decision` devuelve las frases de retirada), `/resources` con el RRS, y `/phrases` sin
sesión devuelve 401.
