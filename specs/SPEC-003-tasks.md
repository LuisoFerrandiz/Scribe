# SPEC-003 — Tareas

Revisión aprobada en la ronda 2 (`SPEC-003-review.md`).

Commit por bloque, solo con orden del dueño.

- [x] T1 `draftStore`: `readRailCollapsed` / `writeRailCollapsed` protegidos, con test (por defecto desplegado;
      guardar y leer; almacenamiento que falla).
- [x] T2 `CaseRail`: botón de plegar/desplegar, franja plegada (estado de guardado y número de caso), sin quitar
      el foco del texto, con nombre accesible y `aria-expanded`.
- [x] T2b Franja plegada con los botones Search y Reading (iconos con nombre y ayuda) y estado de error con forma
      distinta ("!"), según la revisión (ronda 1).
- [x] T3 `CaseView` y estilos: estado recordado, rejilla de dos anchos, versión de pantalla estrecha.
- [x] T4 Verificación en el navegador (criterios 1-6 de la spec, incluido T1-T3 ya escritos antes de la revisión) con un caso de prueba y texto largo.
- [x] T5 Lint, typecheck, tests y build limpios; marcar la spec como hecha.

Verificado en el navegador el 2026-10-26: criterios 1-6 cumplidos (el de 800 px con un iframe de ese ancho, porque la
ventana no cambia el viewport). Hallazgo corregido durante T4: en pantalla estrecha la lista de partes quedaba aplastada.
