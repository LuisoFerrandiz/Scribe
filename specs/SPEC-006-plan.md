# SPEC-006 — Plan

## Diseño

- **Ficheros** (`<DATA_DIR>/phrases/base/`, versionados): ver RF-001. Formato en RF-002; ejemplo:
  ```
  # Protest Conclusions
  box: conclusion

  ### 60.4(c)(3)
  Texto con [X] [Y] [valid|invalid] tal cual.

  ###
  Frase sin etiqueta.
  ```
  Una frase empieza en una línea que cumple `^###( .*)?$` y acaba en la siguiente `###` o al final del fichero. Antes de
  la primera frase solo se admiten líneas en blanco, `# título` y `box: …`. La línea justo bajo `###` que empiece por
  `box:` fija la sección de esa frase.
- **`apps/api/src/phrases/files.ts` (nuevo).** `parsePhraseFile(name, text)` puro → `{ phrases, errors }`;
  `readPhraseFiles(dir)` lee los `.md` (ordenados); `syncPhrases(conn, dir)` con la conexión recibida (como
  `ensureColumns`, para poder probarla con una BD temporal). Devuelve `{ ok: true, total, added, removed, perFile }` o
  `{ ok: false, errors }`.
- **Sincronización.** Compara por clave `box + label + body` como multiconjunto contra las filas `origin='base'`. Sin
  diferencias, no escribe. Con diferencias, una sola transacción: borra las filas `base` de `phrase_fts` (`phrase_id`
  como número) y de `phrase`, e inserta todo (`phrase` y `phrase_fts`). `added`/`removed` salen de la comparación.
- **Estado para el botón.** `GET /phrases/status` devuelve, por fichero, cuántas frases tiene (parseando), los errores si
  los hay y **una sola** indicación global `differs`/`added`/`removed` respecto a la BD. La BD no guarda de qué fichero
  viene cada frase, así que no se marca "changed" por fichero.
- **Rutas** (`routes/phrases.ts`): `GET /phrases/status` y `POST /phrases/reload`, ambas con `requireAdmin`; `reload` →
  200 con el resumen, o 422 con `errors`. Rutas existentes sin cambios.
- **Arranque.** `server.ts` llama a `syncPhrases` tras `ensureColumns`, dentro de `try/catch`, y escribe en el log el
  resultado o el aviso. `migrate.ts` la llama en lugar de `seedBasePhrases`.
- **Web.** `PhrasesDialog.tsx` (nuevo) y botón "Phrases" en `CaseList.tsx`; `api.ts` y `types.ts` con las dos llamadas.
  Estilo del diálogo como el de "Protest form". No toca el estado del caso abierto.
- **Conversión única.** Script en el scratchpad (no se entrega): usa el parser HTML actual sobre el `.md` único, escribe
  los 8 ficheros y comprueba que las 333 coinciden con lo que hay en la BD. Después se borran el `.md` único, el conversor,
  el parser HTML y `seedPhrases.ts`.

## Archivos

`apps/api/src/phrases/files.ts` (+ test), `routes/phrases.ts` (+ test), `server.ts`, `db/migrate.ts`, retirados
`db/seedPhrases.ts` y `phrases/convertSeedToMarkdown.ts`/`parseSeedMarkdown.ts`, `package.json` (xlsx);
`apps/web/src/components/PhrasesDialog.tsx`, `CaseList.tsx`, `api.ts`, `types.ts`, `styles.css`;
`data/phrases/base/*.md`; `DECISIONS.md` (D-006).

## Riesgos

- **Datos del dueño.** Todo o nada: un error nunca vacía las frases. La recarga solo toca `origin='base'`. Se prueba en una
  copia de su BD, no en la real. Al primer arranque con los ficheros nuevos, el CRLF→LF de 7 frases cuenta como
  diferencia y las frases base se reemplazan una vez; el total sigue en 333.
- **Ids de frase.** Cambian al recargar; no hay claves foráneas a `phrase` y el texto se copia a la decisión, no se
  referencia. Una sugerencia abierta en ese instante puede apuntar a un id viejo: no inserta nada por sí sola.
- **Frase partida a mano.** Un `### ` dentro de un texto la parte en dos. El diálogo enseña el número de frases de cada
  fichero para que se note.
- **Sesión.** Reiniciar la API desloguea (SESSION_SECRET vacío); el botón evita reiniciar.
- **Arranque nunca bloqueado.** Todo error de lectura o parseo se captura y se registra.
