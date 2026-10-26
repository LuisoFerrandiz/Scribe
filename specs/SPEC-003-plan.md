# SPEC-003 — Plan

Solo web (`apps/web`). Sin cambios en la API ni en la base de datos.

## Diseño

- **Estado:** `railCollapsed` (booleano) en `CaseView`, inicializado desde `localStorage` (`scribe.rail`).
  `draftStore.ts` ya concentra los accesos protegidos a `localStorage`; ahí van `readRailCollapsed` y
  `writeRailCollapsed`, con `try/catch` como el resto (preferencia de comodidad, nunca estado crítico).
- **Componente:** `CaseRail` recibe `collapsed` y `onToggle`. Desplegado: lo de hoy más un botón `«` arriba a la
  derecha. Plegado: botón `»`, botones de iconos Search y Reading (los mismos manejadores que las herramientas del panel),
  indicador de estado (`role="status"`, con el texto de estado como `aria-label` y `title`; un punto en Saved y Saving y
  un "!" en Offline y Not saved) y el número de caso en vertical (`writing-mode: vertical-rl`).
- **Rejilla:** `.doc` pasa a `grid-template-columns: 17rem 1fr`; con la clase `rail-collapsed`, `3.25rem 1fr`.
  Por debajo de 900 px la rejilla es una columna y el panel plegado es una barra fina horizontal.
- **Foco:** el botón cancela `mousedown` (igual que `Tool`) para no sacar el cursor del texto.
- **Movimiento:** sin animación (la acción del usuario ya es el cambio; evita desplazar el texto mientras se escribe).

## Archivos

- `apps/web/src/draftStore.ts`: `readRailCollapsed`, `writeRailCollapsed`.
- `apps/web/src/components/CaseView.tsx`: estado, botón, franja plegada.
- `apps/web/src/styles.css`: `.rail-collapsed`, franja, botón, versión estrecha.
- `apps/web/src/draftStore.test.ts`: preferencia (por defecto, guardar/leer, almacenamiento roto).
- `specs/SPEC-003-*`, tareas.

## Riesgos

- El texto de las secciones usa `textarea` con altura automática: al cambiar el ancho de la columna se recalcula la
  altura. Se comprueba en el navegador con texto largo.
- El indicador plegado debe ser visible sin leer texto: color (verde, azul, naranja) y forma (punto o "!"), más el
  nombre accesible, para no depender solo del color.
