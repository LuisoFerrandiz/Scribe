# SPEC-001 — Tareas (v2)

Commit por bloque, solo con orden del dueño. Cada archivo copiado del old se anota en `DECISIONS.md`.

- [x] T0 Init: `.gitignore`, `CLAUDE.md`, `DECISIONS.md` (D-001), `.env.example`.
- [ ] T1 Copiar la lista "tal cual" del plan y `constitution.md` recortado (límites y seguridad
      vigentes, renumerados); `npm install` y build limpios.
- [ ] T2 Esquema recortado (sin jury, case_link, citas, `boat`, `person`) y modelo nuevo
      (`event`, `protest_case`, `party`, `witness`); `migrate` limpio en BD vacía.
- [ ] T3 Recortar `rules` a la búsqueda por texto; reescribir `server.ts` y `routes/index.ts` sin las
      rutas descartadas; sembrar frases y cargar RRS; comprobar que las FTS responden.
- [ ] T4 Rutas de eventos, casos, partes, testigos y documento (`PATCH /cases/:id/doc` con 409).
- [ ] T5 `GET /suggest` y `GET /search` con los umbrales de RF-005 y RF-006.
- [ ] T6 Web: login, lista de casos y alta de caso (evento, partes y testigos planos).
- [ ] T7 Web: documento continuo, cabecera, guardado automático, borrador local, indicador de estado.
- [ ] T8 Web: datos a mano (RF-004, un único candidato).
- [ ] T9 Web: línea de sugerencia fija (RF-005, Tab solo con sugerencia visible).
- [ ] T10 Web: `Ctrl+K` e inserción de cita verificada (RF-006).
- [ ] T11 Web: `F2` modo lectura con restauración de cursor; copiar sección/todo y descargar .txt (RF-008, RF-009).
- [ ] T12 `ai/extract.ts` mínimo y `POST /cases/:id/extract`; UI de propuesta con aceptación.
- [ ] T13 Verificación local de los criterios 1-7 con casos de prueba (incluye cortar red y reabrir, 60 partes,
      dos pestañas con 409).
- [ ] T14 Despliegue (stack nuevo) y verificación en vivo.
- [ ] T15 Prueba en una audiencia real (criterio 8); anotar fallos; corregir antes de añadir funciones.
