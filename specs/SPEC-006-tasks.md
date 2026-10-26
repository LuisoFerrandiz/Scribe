# SPEC-006 — Tareas

Commit por bloque, solo con orden del dueño. Implementar solo tras la revisión aprobada y la orden del dueño.

- [x] T1 `phrases/files.ts`: `parsePhraseFile` y `readPhraseFiles` + tests (frase con y sin etiqueta, multilínea, `box` por
      frase y por defecto, CRLF→LF, texto verbatim con `[a|b]`, cada error con fichero y línea). (RF-002, RF-005)
- [x] T2 `syncPhrases` + tests sobre SQLite real temporal: reemplaza `base` y respeta `own`; sin diferencias no escribe;
      con error no toca la BD; FTS coherente (conteo y búsqueda); añadir/borrar/editar. (RF-004, RF-005)
- [x] T3 Conversión única de las 333 con el parser actual: 8 ficheros en `data/phrases/base/`, reparto 31/58/151/32/19/15/15/12,
      igualdad con la BD actual salvo CR; borrar el `.md` único. (RF-001, RF-003)
- [x] T4 Arranque y migrate: `server.ts` y `migrate.ts` llaman a `syncPhrases` con `try/catch`; test de que con ficheros
      rotos o ausentes no lanza y la BD queda igual; retirar `seedPhrases.ts`, el conversor y el parser HTML; quitar
      `xlsx` si sobra; DECISIONS D-006. (RF-006, RF-008)
- [x] T5 API: `GET /phrases/status` y `POST /phrases/reload` (admin) + tests (200, 422 con errores, sin permiso). (RF-004, RF-005, RF-007)
- [x] T6 Web: botón "Phrases" y `PhrasesDialog` (ficheros con su número de frases, diferencia global con la BD, recargar,
      resultado o errores). (RF-007)
- [x] T7 Verificación: copia de la BD del dueño; `Ctrl+K` y sugerencia iguales que antes; editar/añadir/borrar y recargar
      con botón y con reinicio; error con línea; arrancar con `.md` roto y sin ficheros; `own` intacta; lint, typecheck,
      tests y build. (criterios 1-8)

Verificado el 2026-10-26 sobre una copia de la BD del dueño (no la real): el primer arranque reemplazó las frases base una vez
(+10, −10: 7 por CRLF y 3 etiquetas partidas en dos líneas) y el total siguió en 333; `Ctrl+K` da los mismos resultados que
antes (mismo conjunto en 8 consultas; en 2 cambia el orden entre empates y una etiqueta pasa de dos líneas a una).
En el navegador: el diálogo "Phrases" muestra los 8 ficheros; editar una frase, añadir una y borrar otra y pulsar
"Reload from files" da `Loaded 333 phrases (+2, −2)` y se ven en la búsqueda sin reiniciar; un `box: concluson` da
`validity.md:2 — unknown section` y no cambia nada; con el fichero roto la API arranca igual con las frases anteriores;
arreglado y editado, el reinicio recarga (+1, −1); la frase `own` sobrevive. Lint, typecheck y tests en verde (API 58, web 43)
y build de la web limpio.
