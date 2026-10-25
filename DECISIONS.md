# DECISIONS

Solo se añade, no se edita el historial.

## D-001 — Reinicio del proyecto desde el uso real (2026-10-25)

**Contexto.** El dueño usó la v1 en un evento real y no pudo usarla: demasiada complejidad y capas, el
objetivo se perdió. El dueño es el escribano y redacta en vivo; su atención está en la audiencia.

**Decisión.** Proyecto nuevo, simple, con la base reutilizada por lista cerrada. v1 = datos a mano,
una línea de sugerencia determinista, buscador `Ctrl+K`, documento continuo, modo lectura y ortografía
del navegador. Sin IA de redacción en la v1.

**Alternativas.** (a) Recortar el repo actual: descartada, las capas se apoyan unas en otras y el hábito de
specs que causó la deriva seguía. (b) Empezar de cero total: descartada, la ingestión, el corpus y las
frases ya funcionan. (c) Mantener el fantasma de IA en la v1: descartada por simplicidad; se reevalúa tras
probar en una audiencia real.

**Consecuencias.** El old queda congelado en `Scribe_helper_old` y en producción. Todo lo que se copie
se anota aquí.
