# SPEC-003 — Revisión

Método: `specs/METODO.md`. Revisión retroactiva de la primera ronda: T1-T3 ya estaban escritas cuando el dueño pidió
la revisión (2026-10-26); el código existente se contrasta con la spec corregida antes de seguir.

## Ronda 1 — 2026-10-26 — RECHAZADA

Hallazgos:

1. **Deriva / lo ya pedido (spec).** Plegar el panel esconde los botones **Search** y **Reading**. El dueño pidió
   expresamente botones "en lugar de teclas" para `F2` y `Ctrl+K`. La spec decía que seguían en el teclado, y eso
   rompe lo que pidió. → La franja plegada debe conservar los dos botones.
2. **Riesgo no cubierto (spec).** El estado de guardado plegado depende del color de un punto. Un fallo de guardado
   ("Offline – will retry", "Not saved") no debe distinguirse solo por color (y es lo más grave en una audiencia).
   → Los estados de error deben cambiar también de **forma**.
3. **Criterios (spec).** El criterio 2 solo dice "cambia de color". No comprueba el nombre accesible ni la forma.
   → Reformular.
4. **Tareas.** Ninguna tarea cubre los botones de la franja ni la forma del estado de error (consecuencia de 1 y 2).
   → Añadir tarea.
5. **Proceso.** Código escrito antes del veredicto. → T1-T3 se vuelven a comprobar contra la spec corregida (T4).

Cambios hechos: spec (RF-002, criterios 2 y 6), plan (franja con botones, estado por forma), tareas (T2 ampliada, T4
ampliada).

## Ronda 2 — 2026-10-26 — APROBADA

1. Visión y límites: sin choque; no inserta ni cita nada.
2. Deriva: los botones pedidos siguen a un clic; el panel plegado devuelve ancho al texto. Pasa.
3. Requisitos: RF-001 a RF-007 comprobables y sin contradicción.
4. Criterios: cada uno tiene una prueba concreta (navegador o test del helper).
5. Plan: toca solo la web; el riesgo del foco y de la altura de los `textarea` está en T4.
6. Tareas: cada RF tiene tarea; ninguna tarea sin RF.
7. Datos reales: no toca datos; la preferencia es local al navegador.

Se puede implementar.

## Ronda 3 — 2026-10-26 — APROBADA

Hallazgo de la autocrítica de la ronda 2 (spec): el criterio 4 y RF-007 decían que "Case data" funciona con el panel
plegado, pero su botón no está en la franja. Es una contradicción interna. Se corrige la redacción (Case data ya abierto
sigue abierto; abrirlo de nuevo pide desplegar) en vez de añadir un tercer botón a la franja, que no se pidió.
Resto sin cambios. Se puede implementar.
