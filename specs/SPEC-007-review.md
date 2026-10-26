# SPEC-007 — Revisión

Método: `specs/METODO.md`.

## Ronda 1 — 2026-10-26 — RECHAZADA

1. **Spec (fin de la sesión).** No decía qué pasa con `Tab` tras la última marca: o se sale de la caja sin querer o se queda
   atrapado. → RF-006: la sesión termina, el cursor queda al final del bloque y no se sale de la caja.
2. **Spec (`X`/`Y` en la línea).** La línea habría mostrado `Alt+1 X  Alt+2 Y`, que no dice nada. → RF-003: se muestra ya
   identificada (`Alt+1 ITA 3856`).
3. **Spec y plan (línea de una sola línea).** Hay alternativas con frases enteras; no caben en la línea fija, y la línea no
   puede crecer (SPEC-001 criterio 5). → opciones recortadas con `…`; el texto completo se ve en la caja.
4. **Plan (teclado español).** `AltGr` llega como `Ctrl+Alt` y escribe símbolos; un atajo `Alt+dígito` ingenuo los
   secuestraría. → el atajo solo actúa con `Alt` sin `Ctrl` y por tecla física.
5. **Spec (`personal.md`).** No decía qué pasa con las marcas en las frases propias. → no se convierten; se escriben a mano.

Cambios hechos: spec (RF-003, RF-006, marcas), plan (riesgos de teclado y de línea).

## Ronda 2 — 2026-10-26 — APROBADA

1. Visión y límites: nada se escribe sin una acción del escribano (elegir, aceptar, escribir); la propuesta solo se muestra
   en la línea. Regla general D-007 aplicada: marca no reconocida o sin dato = se queda como está.
2. Deriva: quita borrar alternativas y escribir partes y fecha; no quita nada. Una frase sin marcas va igual que hoy.
3. Requisitos: RF-001..010 comprobables; sin contradicción tras los cambios.
4. Criterios: cada uno con prueba concreta (test, navegador, medida de layout o comparación de texto contra el original).
5. Plan: toca solo el front y los `.md`; riesgos de `Tab`, teclado, línea, undo y conversión tienen respuesta.
6. Tareas: cada RF tiene tarea; ninguna sobra.
7. Datos reales: solo cambian `.md` versionados; la conversión es reversible con git y deja lista de dudosos; se prueba
   primero sobre una copia de la BD.

No se implementa hasta la orden del dueño.
