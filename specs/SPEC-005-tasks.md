# SPEC-005 — Tareas

- [x] T1 IA: `witnesses` en `normalize` (limpieza, tope) y `extract` (forma, sistema, prompt). Tests de `normalize`. (RF-001, RF-004)
- [x] T2 Web: `Extraction.witnesses`; `mergeWitnesses.ts` con tests (nuevo, repetido con otras mayúsculas, fila vacía rellena, existentes y su parte intactos, lista vacía). (RF-002, RF-003)
- [x] T3 Web: casilla y lista en `ProtestFormDialog`; aplicar con `setWitnesses` enviando la lista completa; sin testigos no se muestra nada. (RF-002..004)
- [x] T4 Verificación: extracción real con los formularios públicos del dueño (caso `08, 09, 11`) sin inventar; navegador con BD de prueba (aceptar, no duplicar, parte conservada); lint, typecheck, tests.
