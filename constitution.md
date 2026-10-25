# Constitution — Scribe Helper

Límites que no se rompen. Heredados del proyecto anterior (`Scribe_helper_old/constitution.md`),
recortados a lo que sigue vigente en la v1. Brújula de producto: `VISION.md`. Reglas de trabajo:
`CLAUDE.md`. Decisiones: `DECISIONS.md`.

Append-only: para cambiar un límite se añade una enmienda al final y una entrada en `DECISIONS.md`.

## Límites no negociables

- **La herramienta no decide nada.** El humano decide; la herramienta propone, rellena, busca y formatea.
- **Nada se cita si no está en el corpus.** Ningún número de regla que no se pueda trazar a texto cargado
  en `data/rules/` se produce ni se inserta, ni por una sugerencia ni por un fallback.
- **Toda afirmación de regla muestra su fuente**, visible sin salir de la pantalla.
- **Una frase propia del usuario nunca se presenta como una regla.**
- **Cuando el sistema no está seguro, lo dice.** Una sugerencia vacía es mejor que una confiada pero incorrecta.
- **Nada se inserta sin una acción explícita del usuario.** Sin auto-aceptar, sin reemplazo silencioso de
  texto escrito por el usuario.
- **Material de reglas importado solo cuenta tras revisar su Markdown y aceptarlo.** Sin OCR. El `.md`
  nunca se edita a mano; el original se conserva junto a él. Una conversión casi vacía avisa.
- **Material permanente y material de evento, separados.** El material de evento se reemplaza en cada regata.
- **Todo lo que no es IA funciona sin conexión.**
- **El producto está en inglés** (interfaz, código, comentarios); el chat de trabajo es en español.
- **Términos de las reglas de vela con su significado exacto** (*keep clear*, *mark-room*, *proper course*…).

## Seguridad y datos

- **La API key del modelo nunca llega al navegador**; toda llamada al modelo pasa por la API.
- **Toda configuración por variables de entorno**; `.env` nunca se commitea, `.env.example` sin valores.
- **Todos los datos viven bajo `data/`**, que es también el volumen montado y la copia de seguridad.
- **Sin datos personales reales de competidores en el repositorio** ni en ejemplos publicados.
- **Solo rutas relativas** en el código.
- **El servidor escucha en `0.0.0.0`**, nunca en `localhost` (dentro de un contenedor es inalcanzable).
- **La timezone viene de configuración**, nunca del host; la hora de la audiencia se guarda en la del evento.
- **Sesión:** cookie firmada (HMAC-SHA256 sobre `node:crypto`); el payload no contiene secretos.

## Calidad

- No hay suite de tests ni linter. Chequeo automatizado: `tsc --noEmit` (web) y `npm run build` (api).
  La verificación real es manual, en vivo, y **en una audiencia real** antes de añadir funciones.
- Debounce en cada llamada que cueste dinero o red; cancelar las superadas.
- Verificar hechos del producto (modelos, precios, APIs) contra la documentación vigente al implementar.

## Quién decide

El dueño del proyecto decide todo lo significativo.
