# SPEC-007 — Rellenar los corchetes de las frases

Estado: HECHA (2026-10-26), revisada (SPEC-007-review.md, ronda 2 APROBADA) y verificada. Origen: petición del dueño. Regla general que la gobierna: **ante la duda, dejarlo como
está** (CLAUDE.md, D-007).

## Problema

161 de las 333 frases base llevan corchetes (543 en total) que el escribano tiene que resolver a mano después de insertar
la frase: borrar las alternativas que sobran (`[valid] [invalid]`) y escribir lo que falta (`[date]`, `[##]`, `[X]`, `[Y]`).
Hoy, en plena audiencia, eso es tecleo y atención fuera del texto. Los corchetes se ven todos iguales, aunque hacen cosas
distintas, y la app no puede saber cuál es cuál.

## Objetivo

Tras insertar una frase, el sistema te lleva de marca en marca **dentro del propio texto**: te deja elegir la alternativa
(y borra las demás) y escribir el dato (proponiéndolo cuando lo sabe). Lo que no se reconoce o no se resuelve se queda
como está. Las marcas se escriben en los `.md` con una sintaxis que no se confunde con el texto.

## Test de deriva

- ¿Quita tecleo real? Sí: borrar alternativas y escribir las partes del caso y la fecha en cada frase con corchetes.
- ¿Qué se quita a cambio? Nada. Una frase sin marcas se inserta igual que hoy; las marcas que no resuelvas se quedan.

## Marcas en los `.md` (el texto de la frase se sigue guardando tal cual)

- **Alternativas, eliges una:** `[a|b|c]` (de 2 a 9 opciones). Una opción puede llevar datos (`{...}`), nunca otra alternativa.
- **Dato que se escribe:** `{nombre}`. Nombres con propuesta: `{X}` (protestante), `{Y}` (protestado), `{date}`, `{race}`,
  `{case}`. Cualquier otro (`{##}`, `{name}`…) no propone nada y solo deja el hueco para escribir.
- Un corchete sin `|` (`[injury]`), una marca mal cerrada, una alternativa dentro de otra o con más de 9 opciones **no es
  una marca**: es texto, se inserta y se queda como está.
- Las frases propias de `personal.md` no se convierten: si quieres marcas en ellas, las escribes tú con esta misma sintaxis.
- `X` o `Y` exactos como opción de una alternativa (`[X|Y]`, `[Y|The RC|The PC]`) se sustituyen, al elegirlos, por la
  identificación de esa parte.

## Requisitos

- **RF-001 Reconocer marcas.** Una función pura busca en un texto las marcas válidas (posición, tipo, opciones) y
  descarta todo lo demás. Es la única que decide qué es una marca (regla general).
- **RF-002 Empezar.** Al insertar una frase que tiene marcas (con `Tab` en la sugerencia o `Enter` en `Ctrl+K`) arranca
  una sesión de relleno sobre el bloque insertado y la primera marca queda seleccionada. Una frase sin marcas no arranca nada.
- **RF-003 Alternativas.** Con una alternativa seleccionada, la línea de sugerencia de la caja lista las opciones
  numeradas. `Alt+1`…`Alt+9` elige: el texto de la alternativa se reemplaza por la opción elegida y las demás desaparecen.
  Si la opción es `X` o `Y` se escribe la identificación de la parte (RF-005), y la línea la muestra ya identificada
  (`Alt+1 ITA 3856`), no como `X`. La línea es de una sola línea: cada opción se recorta con `…` y, si no caben todas,
  se corta con `…` (el texto completo de las opciones se ve seleccionado en la propio caja).
- **RF-004 Datos.** Con un dato seleccionado, escribir lo reemplaza. Si la app conoce el dato, la línea de sugerencia lo
  ofrece (`Tab` = aceptar y seguir), sin escribirlo en el texto hasta que lo aceptes. Sin propuesta, `Tab` salta el hueco
  sin tocarlo. Propuestas: `{date}` = fecha de la audiencia del caso (`AAAA-MM-DD`), `{race}` = regata del caso (como se
  escribió), `{case}` = número de caso. Si el caso no tiene ese dato, no hay propuesta.
- **RF-005 Partes.** `{X}` es el protestante y `{Y}` el protestado; la identificación de una parte es su número de vela, o
  si no tiene su barco, o si no su nombre. Con varias partes del rol, se ofrecen numeradas (`Alt+1`…). Sin parte de ese
  rol o sin ningún dato, no hay propuesta y el hueco se queda.
- **RF-006 Navegar y terminar.** `Tab` pasa a la siguiente marca del bloque sin cambiar la actual si no se resolvió. Tras
  la última, la sesión termina y el cursor queda al final del bloque (sin salir de la caja). `Esc` termina la sesión. Termina también al no quedar marcas, al perder el foco la caja, al mover el cursor fuera del
  bloque o al editar fuera de él. Fuera de una sesión, `Tab` y `Esc` hacen lo de siempre (completado gris, sugerencia,
  salir de la caja). Dentro, el completado gris tiene prioridad sobre la sesión cuando se ve.
- **RF-007 Sin cambios de layout.** La sesión usa la línea de sugerencia existente (misma altura y posición, SPEC-001
  criterio 5). No hay diálogos ni ratón.
- **RF-008 Nada solo.** No se cambia el texto salvo por una acción del escribano (elegir, aceptar, escribir). Terminar la
  sesión deja el texto como esté, con las marcas sin resolver tal cual (D-007).
- **RF-009 Conversión de los `.md`.** Una conversión de una sola vez reescribe las frases base con estas reglas, y lo que
  no encaja se deja igual y se anota para revisión del dueño:
  - Dos o más corchetes seguidos (solo espacios o nada entre ellos) → una alternativa `[a|b|c]`.
  - Un corchete cuyo contenido es exactamente `##`, `date`, `insert name`, `X` o `Y` → `{##}`, `{date}`, `{name}`, `{X}`, `{Y}`.
  - `##` dentro de las opciones de una alternativa → `{##}`.
  - Se dejan sin tocar: frases con corchetes anidados o sin cerrar; secuencias de corchetes donde algún miembro es un
    dato (`##`, `date`, `insert name`); corchetes sueltos con cualquier otro contenido.
  Se entrega la lista de lo dejado (fichero, etiqueta, motivo) en `specs/SPEC-007-conversion.md`. Cada fichero se puede
  revertir con git. `personal.md` no se toca.
- **RF-010 Recarga.** Tras convertir, "Reload from files" carga las frases con sus marcas (el cargador no cambia: el texto
  va verbatim). El número total sigue en 333.

## Fuera de alcance

Texto opcional (`[?…]`); resolver `X`/`Y` sueltos fuera de corchetes en el texto (`while Y on port…`); nombrar los `##`
(audiencia, regata, regla); más de 9 opciones; deshacer con `Ctrl+Z` más allá de lo que ya hace la caja; la fecha del
incidente y el número de audiencia (la app no los guarda); validar las marcas al recargar.

## Criterios de aceptación

1. Una frase con `[valid|invalid]`: se inserta, queda seleccionada, la línea muestra `Alt+1 valid  Alt+2 invalid`, `Alt+2`
   deja solo `invalid` y borra el resto.
2. Una frase con `{date}` y un caso con audiencia: la línea ofrece la fecha, `Tab` la escribe y pasa a la siguiente marca.
3. `[X|Y]` en un caso con 1 protestante (ITA 3856) y 1 protestado (UAE 3854): `Alt+1` escribe `ITA 3856`. Con 2
   protestados, `{Y}` ofrece los dos.
4. Una frase sin marcas, o con solo texto entre corchetes (`[injury]`), se inserta y se comporta como hoy.
5. `Esc` y mover el cursor fuera del bloque terminan la sesión sin tocar el texto; `Tab` vuelve a salir de la caja.
6. La altura y la posición de las cinco cajas no cambian durante la sesión (medido como en SPEC-001).
7. Tras la conversión, las 333 frases cargan sin errores; `git diff` solo cambia corchetes por marcas; las frases dejadas
   están en `SPEC-007-conversion.md`; ninguna frase pierde texto (quitando marcas, el texto coincide con el original).
8. Probado sobre una copia de la BD del dueño antes de tocar la real.
