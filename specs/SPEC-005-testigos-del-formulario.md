# SPEC-005 — Testigos desde el protest form

Estado: HECHA (2026-10-26), revisada (SPEC-005-review.md, ronda 1 APROBADA); falta solo la prueba en navegador. Origen: petición del dueño ("se deben extraer testigos si existen en el protest form; si no existen se deja en blanco").

## Problema

El protest form lista los testigos ("Witnesses"). La extracción no los lee; el escribano los teclea en "Case data".

## Objetivo

La extracción propone también los **testigos** del formulario; al aceptar se añaden al caso. Si el formulario no
tiene testigos, no se propone nada y el caso queda como está (en blanco).

## Test de deriva

- ¿Quita tecleo real? Sí: los nombres de testigos.
- ¿Qué se quita a cambio? Nada. Es una propuesta que solo se aplica al aceptar.

## Requisitos

- **RF-001 Extracción.** La IA devuelve `witnesses`: lista de nombres tal como los escribe el formulario. Solo nombres de
  personas que el formulario declara testigos; sin testigos, lista vacía; nunca se inventa. Se quitan vacíos y repetidos.
- **RF-002 Propuesta.** El diálogo "Protest form" muestra "Add N witnesses:" con casilla y la lista, solo con los que el
  caso no tiene (mismo nombre, sin distinguir mayúsculas ni espacios, cuenta como ya existente).
- **RF-003 Aceptar.** Al aceptar se añaden al final de la lista de testigos del caso. Una fila de testigo vacía se rellena
  en vez de dejar un hueco. Los testigos que ya hay (y a qué parte apoyan) no se tocan; los nuevos quedan sin parte.
- **RF-004 Sin testigos.** Si el formulario no los trae, el diálogo no muestra nada de testigos y no se escribe nada.

## Fuera de alcance

Deducir a qué parte apoya cada testigo; extraer teléfonos o notas del testigo; quitar o cambiar testigos existentes.

## Criterios de aceptación

1. Con un formulario que lista testigos, la propuesta los muestra y al aceptar aparecen en "Case data".
2. Con los formularios del caso `08, 09, 11`, la propuesta no inventa testigos si no los hay.
3. Un testigo ya existente no se duplica; los existentes conservan su parte.
4. Las filas vacías por defecto se rellenan.
