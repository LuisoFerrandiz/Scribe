# Método de trabajo (Spec-Driven con revisión)

Cada cambio que añade o modifica una función sigue este bucle. Lo pidió el dueño el 2026-10-26 (D-005).

```
 SPEC ──> PLAN ──> TAREAS ──> REVISIÓN ──┬─ APROBADA ──> IMPLEMENTAR ──> VERIFICAR ──> commit (con orden)
   ^         ^         ^                 │
   └─────────┴─────────┴── RECHAZADA ────┘   (vuelve al paso que falla y se repite la revisión)
```

## Pasos

1. **Spec** `specs/SPEC-NNN-nombre.md`: problema, objetivo, test de deriva (¿quita tecleo real del escribano?
   ¿qué se quita a cambio?), requisitos numerados (RF-NNN), fuera de alcance, criterios de aceptación medibles.
2. **Plan** `SPEC-NNN-plan.md`: cómo se hace, archivos que se tocan, riesgos.
3. **Tareas** `SPEC-NNN-tasks.md`: lista pequeña, cada tarea con su comprobación; cada RF cubierto por una tarea.
4. **Revisión** `SPEC-NNN-review.md`, **antes de escribir código**. Un revisor (yo, o un agente aparte si el dueño
   lo pide) contesta la lista de abajo y da un veredicto: **APROBADA** o **RECHAZADA** con los motivos.
5. **Si RECHAZADA:** se vuelve al paso que falla (spec, plan o tareas), se corrige y se repite la revisión,
   anotando una nueva ronda. **Máximo 3 rondas**; si la tercera sigue rechazada, se para y se pregunta al dueño.
6. **Si APROBADA:** se implementa tarea a tarea. No se escribe código antes del veredicto.
7. **Verificar:** typecheck, lint, tests y build limpios; comprobación en el navegador de los criterios de
   aceptación; la spec y las tareas se marcan como hechas.
8. **Commit** solo con orden del dueño, uno por bloque.

Cambios mínimos (corregir un texto, un color, un error evidente) no necesitan spec: se anotan en SPEC-002 o en el
commit. Todo lo que cambie el comportamiento o añada una pantalla, sí.

## Lista de la revisión

1. **Visión y límites:** ¿choca con `VISION.md` o con los límites no negociables (nada citado fuera del corpus,
   nada insertado sin acción explícita, vacío antes que incorrecto, clave nunca al navegador)?
2. **Deriva:** ¿el test de deriva está respondido y pasa? ¿Algo que ya pidió el dueño queda roto o escondido?
3. **Requisitos:** ¿son comprobables, sin ambigüedad ni contradicción entre sí?
4. **Criterios:** ¿se pueden verificar con una prueba concreta, en el navegador o con un test?
5. **Plan:** ¿toca solo lo necesario? ¿hay riesgos sin respuesta (datos, foco del cursor, guardado, accesibilidad)?
6. **Tareas:** ¿cada RF tiene tarea? ¿alguna tarea no corresponde a un RF (alcance que se cuela)?
7. **Datos reales:** ¿puede tocar datos del dueño? Si sí, ¿cómo se evita pisar nada?

## Formato del archivo de revisión

```
# SPEC-NNN — Revisión

## Ronda 1 — (fecha) — RECHAZADA | APROBADA
Hallazgos: 1. … (paso a corregir: spec | plan | tareas)
Cambios hechos: …

## Ronda 2 — …
```
