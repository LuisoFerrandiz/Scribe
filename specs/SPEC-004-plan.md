# SPEC-004 — Plan

## Diseño

- **Base de datos.** `protest_case.race TEXT NOT NULL DEFAULT ''` en `schema.sql` (para BD nuevas). Para una BD que ya
  existe: `ensureColumn(table, column, ddl)` en `apps/api/src/db/columns.ts` (comprueba `PRAGMA table_info` y hace
  `ALTER TABLE … ADD COLUMN`, que no toca filas existentes). Se llama desde `migrate.ts` (Docker) y
  al arrancar `server.ts` (misma conexión que usa la API: evita `SQLITE_BUSY` por un `ALTER` desde otro proceso).
  El dueño activa el cambio reiniciando la API; hasta entonces la API en marcha no se toca.
- **Copia de seguridad.** Antes del primer `ALTER`, `VACUUM INTO 'data/db/backup-AAAAMMDD-HHMM.sqlite'` (copia consistente
  aunque haya modo WAL). Solo si la columna falta. `data/db/` ya está en `.gitignore`.
- **API.** `cases.ts`: `race` en `GET`, `POST` (opcional) y `PATCH /cases/:id` (texto recortado, hasta 40
  caracteres), y en la lista `GET /cases`.
- **IA.** `ai/normalize.ts`: `Extraction.race: string` (recortado, hasta 40 caracteres, vacío si falta). `ai/extract.ts`:
  `race` en la forma pedida y una frase en el sistema: "race is the race number the form states (Race No.), exactly as
  written; if the forms give different races list each once, comma separated; empty if none".
- **Web.** `types.ts` (`CaseSummary.race`, `Extraction.race`), `api.ts` (`patchCase`, `createCase`),
  `ProtestFormDialog` (casilla de regata), `CaseDataPanel` y `NewCase` (campo), `CaseView` (`CaseRail`: línea de meta),
  `CaseList` (columna), `docFormat.titleLines`, `useCaseDoc.updateCase` (acepta `race`).

## Archivos

`apps/api/db/schema.sql`, `src/db/columns.ts`, `src/db/migrate.ts`, `src/server.ts`, `src/routes/cases.ts`,
`src/ai/normalize.ts`, `src/ai/extract.ts`, tests de API; `apps/web/src/*` indicados; `docFormat.test.ts`.

## Riesgos

- **Datos reales del dueño.** La BD de producción local tiene casos; el `ALTER ADD COLUMN` no los toca, y se hace copia
  antes. No se borra nada. La migración se prueba antes sobre una copia de la BD real, nunca primero sobre la real.
- **Doble origen del dato.** Se ve en tres sitios; todos leen `c.race` del mismo caso, sin copias (en el navegador
  `updateCase` lo actualiza igual que el número de caso).
- **Extracción con varios formularios.** Que `5, 5, 5` salga como `5`: se pide en el prompt y se de-duplica también en
  `normalize` (por si el modelo lo repite).
