# CLAUDE.md

Scribe Helper (v2, reinicio 2026-10-25). Lee primero `VISION.md`: es la brújula. Si una propuesta
choca con ella, para y pregunta al dueño.

## Qué es
Ayuda al **escribano** de un comité de protestas de vela a escribir la decisión **en vivo durante
la audiencia**, sin quitar la vista de ella. La herramienta no decide: ahorra recordar datos y
buscar en las fuentes (protest form, frases, RRS, normas de evento y clase).

## Proyecto anterior
`C:\Users\luiso\Proyectos\Scribe_helper_old` (copia completa, git y BD). No se modifica. Se copia de
él solo lo que lista `specs/SPEC-001-plan.md`. Sigue corriendo en producción desde su GitHub.

## Reglas de trabajo (del dueño)
- Chat en español; producto, código y comentarios en inglés. Commits en español sin tildes y **sin
  `Co-Authored-By`**.
- **Nunca commit ni push sin orden del dueño en ese intercambio.** Un commit por bloque.
- Spec-Driven con revisión (`specs/METODO.md`): spec → plan → tareas → **revisión** (`-review.md`) → implementar.
  Si la revisión rechaza, se vuelve al paso que falla y se repite (máx. 3 rondas, luego se pregunta al dueño);
  no se escribe código antes de que la revisión apruebe. Antes de añadir una función, pasa el test de deriva:
  ¿quita tecleo real del escribano? ¿qué se quita a cambio?
- Decisiones significativas en `DECISIONS.md` (solo se añade, no se edita). `CLAUDE.md` solo se edita
  cuando el dueño lo ordena.
- Nunca teclear credenciales de producción, nunca pedir ni imprimir `ANTHROPIC_API_KEY`.
- Probar con datos de prueba, nunca con datos reales de competidores.

## Límites no negociables (heredados)
Nada se cita si no está en el corpus. Nada se inserta sin una acción explícita del usuario. Sugerencia
vacía antes que confiada e incorrecta. La API key nunca llega al navegador. Todos los datos bajo
`data/`; configuración por variables de entorno; servidor en `0.0.0.0`; zona horaria por configuración.

## Comandos y despliegue
Se definen al copiar la base (SPEC-001 T1). Despliegue: GitHub nuevo + Portainer, stack nuevo con
volumen y puertos propios. Terminado = typecheck/build limpio, verificado en vivo y probado.
