# SPEC-004 — Número de regata del caso

Estado: HECHA (2026-10-26), revisada (SPEC-004-review.md, ronda 2 APROBADA) y verificada. Origen: petición del dueño.

## Problema

Los protest forms dicen en qué regata ocurrió el incidente ("Race No.: 5"). La app no guarda ese dato: la IA no lo
extrae, el caso no lo tiene y no aparece en los datos principales. El escribano lo teclea a mano en el texto o lo
olvida; es un dato que se repite en cada decisión.

## Objetivo

La extracción del protest form propone también el **número de regata**; al aceptarlo queda guardado en el caso, se
puede corregir en "Case data" y se ve en los datos principales del caso (panel izquierdo, lista de casos y texto de
"Copy all").

## Test de deriva

- ¿Quita tecleo real? Sí: una línea de la cabecera que hoy se escribe a mano en cada caso.
- ¿Qué se quita a cambio? Nada. Es un campo opcional; un caso sin regata funciona igual.

## Requisitos

- **RF-001 Dato del caso.** El caso tiene un campo opcional `race` (texto corto, tal como lo escribe el formulario:
  "5", "Race 3", "R3"). Vacío por defecto. Se crea, se lee y se edita como el número de caso, sin ser único.
- **RF-002 Extracción.** La IA devuelve `race` además del número de caso, los tipos y las partes. Si los formularios
  de un mismo caso dan regatas distintas, devuelve las distintas separadas por coma ("5, 6"). Si no hay, vacío; nunca
  se inventa. La extracción sigue siendo solo una propuesta (nada se guarda sin aceptar).
- **RF-003 Aceptar.** El diálogo "Protest form" muestra "Race: 5 (now —)" con casilla cuando la regata propuesta es
  distinta de la del caso, como el número de caso. Al aceptar se guarda; no pisa nada si no se marca.
- **RF-004 Case data.** El panel "Case data" y el formulario "New case" tienen el campo **Race**, editable.
- **RF-005 Datos principales.** Se ve "Race 5" en el panel izquierdo del caso (junto al evento y los tipos), en la lista
  de casos (columna) y en la segunda línea del texto de "Copy all" ("Race 5 - Protest + Redress - 2026-10-25 18:30").
  Sin regata no se muestra nada ni queda un hueco.
- **RF-006 Base de datos existente.** El campo se añade a una base de datos que ya tiene casos sin perderlos: los casos
  actuales quedan con `race` vacío. Antes de modificar la base se hace una copia de seguridad consistente.

## Fuera de alcance

Validar el formato de la regata, ordenar o filtrar casos por regata, extraer la fecha del incidente o la hora.

## Criterios de aceptación

1. Con el formulario de prueba "Race No.: 5", la propuesta incluye `Race: 5`; al aceptar, aparece en "Case data" y en
   el panel izquierdo.
2. Se puede editar a mano en "Case data" y se conserva al recargar.
3. "Copy all" lleva "Race 5" en la segunda línea; un caso sin regata no lleva hueco ni "Race".
4. La lista de casos muestra la columna.
5. Una BD con casos de antes arranca, conserva todos sus datos y los casos viejos tienen la regata vacía.
6. El caso `08, 09, 11` (tres formularios de la regata 5) propone `5`, no `5, 5, 5`.
