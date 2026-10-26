# SPEC-006 — Frases en ficheros .md editables y recargables

Estado: HECHA (2026-10-26), revisada (SPEC-006-review.md, ronda 2 APROBADA) y verificada. Origen: petición del dueño.

## Problema

Las 333 frases base salen de un único `data/phrases/base/preferred-standard-wording.md` (2,3 MB, tablas HTML en bruto)
que se siembra una sola vez en la tabla `phrase` con `npm run migrate`. El fichero no se puede editar a mano y, aunque
se editara, la app no lo vería: no hay forma de cambiar las frases sin tocar la base de datos.

## Objetivo

Las frases viven en **8 ficheros `.md` legibles** (uno por apartado del índice original que aporta frases). El dueño los
edita a mano y la base de datos se **recarga desde ellos**: sola al arrancar la API y a petición con un botón, sin
reiniciar ni cerrar sesión. El texto de cada frase se guarda tal cual (con sus corchetes) para que otra spec pueda
rellenarlos después.

## Test de deriva

- ¿Quita tecleo real? Indirecto: permite corregir y ampliar la biblioteca de frases sin tocar código ni BD, y es el paso
  previo a rellenar los corchetes (que sí quita tecleo).
- ¿Qué se quita a cambio? El `.md` único y el conversor/parser HTML (código muerto). Nada de lo que el escribano ve.

## Requisitos

- **RF-001 Ficheros.** Existen en `<DATA_DIR>/phrases/base/`: `procedural-matters.md`, `validity.md`,
  `protest-conclusions.md`, `protest-decisions.md`, `redress-conclusions.md`, `redress-decisions.md`, `reopenings.md`,
  `no-hearing.md`. Introduction no se crea (no aporta frases). El `.md` único desaparece.
- **RF-002 Formato.** Cada frase es una línea `### etiqueta` (o `###` sola si no tiene etiqueta) seguida de su texto,
  que puede ocupar varias líneas. La cabecera lleva `box:` (`procedural_matters`, `facts_found`, `conclusion`,
  `decision`) como sección por defecto; una frase puede llevar `box:` en la línea justo bajo su título y manda sobre el
  defecto (así `no-hearing.md` reparte sus frases en tres secciones). El texto se guarda **verbatim** (corchetes, `|`,
  etc. sin transformar); solo se recortan los espacios y saltos de los extremos y CRLF pasa a LF.
- **RF-003 Contenido.** Los 8 ficheros contienen exactamente las 333 frases que hoy hay en la BD (misma sección,
  etiqueta y texto, salvo CRLF→LF), con el reparto 31 / 58 / 151 / 32 / 19 / 15 / 15 / 12.
- **RF-004 Recarga.** Recargar lee los 8 ficheros y deja las frases `base` de la BD (tabla y búsqueda de texto) iguales
  a ellos. Las frases `own` no se tocan. Si los ficheros ya coinciden con la BD no se escribe nada.
- **RF-005 Todo o nada.** Si algún fichero tiene un error (sin `box` resoluble, `box` desconocido, frase sin texto, texto
  antes de la primera frase, fichero ilegible) **no se cambia nada** en la BD y se devuelve la lista de errores con
  fichero, línea y mensaje.
- **RF-006 Al arrancar.** La API recarga al arrancar. Si hay errores o faltan los ficheros, registra el aviso y arranca
  igual con las frases que ya hay: nunca cae por un `.md`.
- **RF-007 Botón.** Un botón "Phrases" en la lista de casos abre un diálogo con los ficheros y su número de frases, indica
  si lo que hay en los ficheros difiere de la BD (una indicación global, no por fichero) y tiene "Reload from files":
  muestra `Loaded 333 phrases (+N, −M)` o los errores `fichero:línea — mensaje`. Solo el administrador puede recargar.
  No cambia el caso abierto ni sus borradores.
- **RF-008 Limpieza.** Se retiran `seedPhrases.ts`, `convertSeedToMarkdown.ts`, `parseSeedMarkdown.ts` y, si nada más la
  usa, la dependencia `xlsx` del API. El `.xlsx` original se queda en `apps/api/seed/` sin leerse.

## Fuera de alcance

Rellenar o marcar corchetes; pantalla para crear o borrar frases propias; ids estables de frase; copia de seguridad
previa a recargar (las frases `base` se regeneran siempre desde los ficheros, que están en git); recarga sin pulsar nada
mientras la API está en marcha (vigilar ficheros).

## Criterios de aceptación

1. Los 8 ficheros existen, el `.md` único no, y al leerlos salen 333 frases con el reparto de RF-003.
2. Las 333 frases de la BD actual y las cargadas desde los ficheros coinciden en sección, etiqueta y texto (CR aparte);
   `Ctrl+K` y la sugerencia dan lo mismo que antes en consultas de muestra. El primer arranque tras el cambio reemplaza
   las frases base una vez (7 llevan CRLF) y el total sigue en 333.
3. Editar el texto de una frase en su `.md`, añadir otra y borrar otra, y pulsar "Reload from files" refleja los tres
   cambios en `Ctrl+K` sin reiniciar la API ni cerrar sesión.
4. Lo mismo, pero reiniciando la API en lugar de pulsar el botón.
5. Un `.md` con un error (por ejemplo `box: nada`) deja la BD como estaba y el diálogo dice qué fichero, qué línea y por qué.
6. Arrancar la API con un `.md` roto, o sin ficheros, la deja funcionando con las frases anteriores.
7. Las frases `own` sobreviven a una recarga.
8. Probado en una copia de la BD del dueño antes de tocar la real.
