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

## D-005 — Revisión obligatoria entre las tareas y el código (2026-10-26)

**Decisión.** El método pasa a ser spec → plan → tareas → revisión → implementar. La revisión se hace con la lista de
`specs/METODO.md` y deja un veredicto (APROBADA o RECHAZADA) en `SPEC-NNN-review.md`. Si rechaza, se vuelve al paso que
falla y se repite; máximo 3 rondas y después se pregunta al dueño. No se escribe código antes de que apruebe.

**Por qué.** Lo pidió el dueño. Hasta SPEC-003 se implementaba justo después de las tareas; una revisión previa encuentra
antes los choques con lo ya pedido (por ejemplo, esconder a la vez botones que el dueño había pedido).

**Alcance.** Cambios de comportamiento o pantallas nuevas. Los ajustes mínimos (texto, color, error evidente) se anotan en
SPEC-002 o en el commit sin spec.

## D-006 — Las frases base salen de 8 ficheros .md editables, no de un .md único sembrado una vez (2026-10-26)

**Decisión.** Las frases base viven en `data/phrases/base/*.md` (uno por apartado con frases: Procedural Matters, Validity,
Protest/Redress Conclusions, Protest/Redress Decisions, Reopenings, NO Hearing), con formato `### etiqueta` + texto. La BD
se recarga desde ellos al arrancar la API y con un botón, y la recarga es todo o nada si algún fichero tiene un error.
El `.md` único, el conversor y el parser HTML se retiran; el `.xlsx` original queda en `apps/api/seed/` sin leerse. Sustituye
la fuente de frases de D-022 (proyecto anterior) y de SPEC-005 (siembra única).

**Por qué.** Lo pidió el dueño: poder corregir las frases a mano y que la app las vea. El texto de cada frase se guarda sin
transformar para poder rellenar los corchetes en una spec posterior.

**Alcance.** Solo las frases `base`; las `own` no se tocan. Rellenar corchetes y una pantalla para frases propias quedan fuera.

## D-007 — Regla general: ante la duda, dejarlo como está (2026-10-26)

**Decisión.** Si el sistema no sabe qué hacer con un dato, un corchete o un texto, lo deja como está: no lo cambia,
no lo rellena y no lo borra. Se añade a los límites no negociables de `CLAUDE.md`.

**Por qué.** Lo pidió el dueño al diseñar el rellenado de corchetes de las frases (SPEC-007): un corchete mal entendido
no debe quedar escrito de forma equivocada en una decisión. Complementa "sugerencia vacía antes que confiada e incorrecta".

**Alcance.** Todo el producto. Cualquier marca, dato o texto que no se reconozca queda tal cual.
