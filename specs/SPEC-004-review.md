# SPEC-004 — Revisión

Método: `specs/METODO.md`.

## Ronda 1 — 2026-10-26 — RECHAZADA

1. **Datos reales (plan, tareas).** La migración añade una columna a la base que contiene los casos reales del dueño. La
   verificación del criterio 5 estaba escrita contra "una BD con casos de antes" sin decir cuál: se podría probar
   directamente sobre la real. → La migración se prueba primero sobre una **copia** de la base real (con sus casos);
   la real solo se migra al reiniciar la API, con la copia de seguridad hecha antes.
2. **Plan.** La API del dueño ya está en marcha con la BD abierta. Si el `ALTER` lo hace `migrate` desde otra terminal
   mientras la API corre, puede dar `SQLITE_BUSY`. → El `ALTER` se hace al arrancar el servidor (misma conexión), y
   `migrate.ts` hace lo mismo para Docker; el dueño reinicia la API para activarlo.
3. **Tareas.** Ninguna tarea comprueba que un caso sin regata no deja hueco en "Copy all" (criterio 3). → Añadirlo a T6.

Cambios hechos: plan (arranque del servidor, copia de la BD real), tareas T1 y T7 (prueba sobre copia) y T6 (sin hueco).

## Ronda 2 — 2026-10-26 — APROBADA

1. Visión y límites: la regata solo se guarda al aceptar la propuesta; nada se cita ni se inserta en el texto.
2. Deriva: quita una línea tecleada en cada caso; no quita nada. Pasa.
3. Requisitos: RF-001 a RF-006 comprobables; sin contradicción.
4. Criterios: cada uno con prueba concreta (test, navegador o extracción real autorizada).
5. Plan: toca solo lo necesario; los riesgos de datos y de varios formularios tienen respuesta.
6. Tareas: cada RF tiene tarea; ninguna sobra.
7. Datos reales: migración aditiva, con copia de seguridad antes y probada primero en una copia.

Se puede implementar.
