# SPEC-004 — Tareas

Commit por bloque, solo con orden del dueño. Revisión aprobada en la ronda 2 (`SPEC-004-review.md`).

- [x] T1 BD: columna `race` en `schema.sql`; `db/columns.ts` (`ensureColumn` con copia de seguridad previa); llamada desde
      `migrate.ts` y `server.ts`. Test: una BD sin la columna la gana sin perder filas y hace copia; la segunda vez no
      hace nada. Probado también sobre una copia de la BD real (casos y adjuntos intactos). (RF-001, RF-006)
- [x] T2 API de casos: `race` en lista, lectura, alta y `PATCH`. Test de rutas. (RF-001)
- [x] T3 IA: `race` en `normalize` (recortada, sin repetidos) y en `extract` (forma y sistema). Tests de `normalize`. (RF-002)
- [x] T4 Web: tipos y API; campo Race en "Case data" y "New case"; `updateCase` con `race`. (RF-001, RF-004)
- [x] T5 Web: casilla de regata en el diálogo "Protest form". (RF-003)
- [x] T6 Web: Race en el panel izquierdo, en la lista de casos y en `titleLines`/"Copy all"; un caso sin regata no
      deja hueco ni dice "Race". Test de `docFormat` con y sin regata. (RF-005)
- [x] T7 Verificación: la extracción real con el caso `08, 09, 11` (datos públicos que el dueño autorizó) devuelve `5`;
      navegador: aceptar, editar, recargar; la copia de la BD real arranca y conserva sus casos (criterios 1-6); la real se migra al reiniciar el dueño la API. Lint, typecheck,
      tests y build limpios.

Verificado el 2026-10-26: extracción real del caso `08, 09, 11` devuelve `race: "5"` (una vez, no tres); en el navegador, sobre una
copia de la BD real arrancada como lo hará el dueño, la migración añadió la columna y dejó copia de seguridad, los casos y
adjuntos quedaron intactos, y la regata aceptada se ve en el panel izquierdo, en "Case data", en la lista y tras recargar.
La BD real del dueño aún no está migrada: se migra al reiniciar la API (con copia de seguridad automática).
