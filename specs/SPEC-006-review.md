# SPEC-006 — Revisión

Método: `specs/METODO.md`.

## Ronda 1 — 2026-10-26 — RECHAZADA

1. **Plan (estado por fichero).** El borrador marcaba "changed" por fichero en el diálogo. La BD no guarda de qué fichero
   viene cada frase (y `no-hearing.md` reparte frases entre tres secciones), así que no se puede calcular. → Una sola
   indicación global (hay diferencia, +N −M) y, por fichero, solo el número de frases.
2. **Criterios (primer arranque).** "Sin diferencias no se escribe" y "el contenido coincide salvo CR" chocan: 7 frases de la
   BD tienen CRLF y los ficheros llevan LF, así que el primer arranque sí reemplaza las frases base. → Decirlo en el criterio
   2 y en los riesgos (reemplazo único, total 333).
3. **Tareas (arranque).** El requisito "nunca cae por un `.md`" no tenía comprobación. → T4 añade un test con ficheros rotos y ausentes.
4. **Spec (cuántos ficheros).** El dueño dijo "9 archivos"; son 8 porque Introduction no aporta frases (lo aceptó: "si no meten
   nada no los crees"). Queda escrito en RF-001.

Cambios hechos: plan (estado global), spec (RF-007, criterio 2), tareas (T4).

## Ronda 2 — 2026-10-26 — APROBADA

1. Visión y límites: no cita nada ni inserta texto en la decisión; la recarga solo cambia la biblioteca, que el escribano sigue
   eligiendo a mano.
2. Deriva: indirecta, pero es el paso previo a rellenar corchetes y quita código muerto; no esconde nada de lo pedido.
3. Requisitos: RF-001..008 comprobables; sin contradicción tras corregir RF-007.
4. Criterios: cada uno con prueba concreta (test, navegador o comparación contra la BD).
5. Plan: toca solo frases, arranque y un diálogo; riesgos de datos, ids, arranque y sesión tienen respuesta.
6. Tareas: cada RF tiene tarea; ninguna sobra.
7. Datos reales: solo toca filas `base`, todo o nada, se prueba primero en una copia de la BD del dueño.

Pendiente de confirmar por el dueño (se asumió "todo o nada" en un error): si prefiere cargar lo válido y avisar del resto.
No se implementa hasta su orden.
