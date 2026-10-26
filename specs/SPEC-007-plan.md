# SPEC-007 — Plan

## Diseño

- **`apps/web/src/fillMarks.ts` (nuevo, puro).** `findMarks(text)` → lista de `{ start, end, kind: 'choice'|'hole', options|name }`;
  reconoce solo las marcas válidas (RF-001) e ignora el resto. `applyChoice(text, mark, i)` y `applyHole(text, mark, value)`.
  Todo con posiciones sobre el texto actual: no guarda estado, se vuelve a buscar tras cada cambio.
- **`apps/web/src/fillData.ts` (nuevo, puro).** `proposalFor(mark, caseData)` → lista de ofertas (`label`, `text`): `{date}`,
  `{race}`, `{case}`, `{X}`/`{Y}` y las opciones `X`/`Y` de una alternativa. Identificación de parte: vela, barco, nombre.
- **Sesión (en `CaseView.tsx`, caja de texto).** Estado `fill: { start, end } | null` (el bloque insertado). Se abre al
  insertar si el bloque tiene marcas (tanto `Tab` como `handle.insert` de `Ctrl+K`) y selecciona la primera marca
  (`setSelectionRange`). `onKeyDown`: con sesión y sin completado gris, `Tab` = aceptar la propuesta de un dato o saltar;
  `Alt+1..9` = elegir; `Esc` = terminar. Tras cada edición dentro del bloque, `end` se corrige por la diferencia de largo;
  una edición o un cursor fuera del bloque lo cierra. Estructura análoga al completado gris existente.
- **Línea de sugerencia (`.suggest-line`).** Muestra, en vez de la sugerencia normal mientras hay sesión, las opciones o la
  propuesta. Misma altura. Texto: `Alt+1 valid  Alt+2 invalid · Tab skip · Esc stop`.
- **Conversión única.** Script en el scratchpad (no se entrega) que aplica RF-009 a los 8 `.md`, escribe
  `specs/SPEC-007-conversion.md` con lo dejado y comprueba que quitando las marcas el texto de cada frase coincide con el
  original (tras normalizar `[a|b]` → `[a] [b]` y `{x}` → `[x]`). El cargador y la BD no cambian.
- **API.** Sin cambios: `body` sigue verbatim. Nada en el servidor interpreta las marcas.

## Archivos

`apps/web/src/fillMarks.ts` (+ test), `fillData.ts` (+ test), `components/CaseView.tsx`, `styles.css`; `data/phrases/base/*.md`
(salvo `personal.md`); `specs/SPEC-007-conversion.md`. CLAUDE.md y `DECISIONS.md` (D-007) ya están actualizados.

## Riesgos

- **`Tab` ya tiene dos usos** (completado gris y sugerencia). Prioridad: completado gris > sesión de relleno > sugerencia
  nueva. La sesión solo existe tras insertar y termina de forma explícita (Esc, cursor fuera, foco, sin marcas), así que
  `Tab` no queda secuestrado.
- **Dígitos al escribir.** Elegir con `1`/`2` chocaría con teclear números; por eso `Alt+dígito`. En Windows y Chrome
  `Alt+dígito` no cambia de pestaña (eso es `Ctrl+dígito`). En un teclado español `AltGr` llega como `Ctrl+Alt` y escribe
  símbolos (`AltGr+1` es `|`): el atajo solo actúa con `Alt` sin `Ctrl`, y usa la tecla física (`e.code`, `Digit1`…).
- **Línea de una sola línea.** Opciones largas (hay alternativas con frases enteras) se recortan con `…` en la línea; el
  texto completo se ve seleccionado en la caja. La altura de la línea no cambia.
- **El texto se pone por estado de React** (como la inserción actual), no por edición del navegador: el `Ctrl+Z` nativo no
  lo deshace, igual que hoy con una frase insertada. Es una limitación existente; no se promete deshacer.
- **Conversión mal hecha.** Una alternativa falsa (dos corchetes seguidos que no son excluyentes) escondería una opción:
  por eso la regla es conservadora, hay lista de dudosos y git permite revertir. Las marcas que el dueño corrija a mano en
  los `.md` se recargan con el botón.
- **Posiciones tras editar.** Se evita guardar posiciones largas: se vuelve a buscar en el bloque tras cada cambio.
- **Datos del dueño.** Solo cambian los `.md` (versionados). Se prueba con una copia de la BD y luego se recarga en la real
  con el botón.
