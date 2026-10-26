# SPEC-007 — Tareas

Commit por bloque, solo con orden del dueño. Implementar solo tras la revisión aprobada y la orden del dueño.

- [ ] T1 `fillMarks.ts` + tests: alternativas (2-9 opciones), datos, dato dentro de una opción, corchete sin `|` ignorado,
      llave desconocida tratada como dato sin propuesta, alternativa anidada, mal cerrada o con 10 opciones ignorada,
      `applyChoice` y `applyHole`. (RF-001, RF-003, RF-004)
- [ ] T2 `fillData.ts` + tests: `{date}` con y sin audiencia, `{race}`, `{case}`, `{X}`/`{Y}` con 0, 1 y varias partes,
      identificación vela > barco > nombre, opción `X`/`Y` de una alternativa. (RF-004, RF-005)
- [ ] T3 Sesión en `CaseView.tsx`: abrir al insertar (`Tab` y `Ctrl+K`), seleccionar la primera marca, `Tab`, `Alt+1..9`,
      `Esc`, cierre por foco, cursor o edición externa, prioridad del completado gris; línea de sugerencia con las
      opciones sin cambiar su altura. (RF-002, RF-003, RF-004, RF-006, RF-007, RF-008)
- [ ] T4 Conversión de los `.md` (RF-009) con el script único; `SPEC-007-conversion.md`; comprobación de que quitando las
      marcas el texto coincide con el original; recarga de prueba sobre una copia de la BD (333, sin errores). (RF-009, RF-010)
- [ ] T5 Verificación en el navegador sobre una copia de la BD: criterios 1-8; medir el layout de las cinco cajas; lint,
      typecheck, tests y build.
