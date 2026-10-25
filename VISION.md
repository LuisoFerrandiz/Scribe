# VISION — Scribe Helper

Brújula del proyecto. Se lee al inicio de cada sesión. Si una propuesta no
encaja aquí, se para y se pregunta al dueño.

Contexto: existió una primera versión (`Scribe_helper_old`) que creció en capas
(fantasma, franja de propuestas, huecos de IA, avisos, nueve pestañas) y **no se
pudo usar en un evento real**. Esta versión se rehace desde el uso real.

## 1. Objetivo

Ayudar al escribano de un comité de protestas de vela a **escribir la decisión
de una protesta real, en vivo, mientras ocurre la audiencia**, sin quitar la
vista de la audiencia. La herramienta no decide: quita tecleo y ahorra buscar.

El dueño es el escribano. Escribe en inglés, que no es su lengua.

## 2. La audiencia real (de dónde sale el diseño)

1. Antes: un regatista presenta la protesta online; el protest form ya existe.
   Los jueces fijan día y hora.
2. Audiencia con las partes (puede faltar alguna): validez del caso, hechos y
   testigos, declaraciones finales. **El escribano va escribiendo hechos,
   conclusiones y decisión mientras se habla.**
3. Deliberación, sin las partes: el escribano **lee lo escrito** a los demás
   jueces y se cambian cosas.
4. Lectura a las partes: hechos, conclusiones, reglas y decisión.

Casuística casi infinita: de 1 a 60 partes; protesta, solicitud de reparación,
solicitud de reapertura o combinaciones; una protesta puede retirarse; un barco
puede tomar penalización, válida o no.

## 3. Las cinco fuentes

1. **Protest form**: partes, número de prueba, tipo de reclamación.
2. **Frases**: templates de un juez, por tipo; se copian y se modifican.
   No son autoridad.
3. **RRS**: la regla según los hechos; de ahí salen las conclusiones, muchas ya
   están en las frases.
4. **Normas de evento y clase**: NoR, SIs y modificaciones; reglas de clase.
   Más específicas que el RRS.
5. **Ejemplos**: decisiones terminadas, para ver la lógica. Último paso.

El valor es **encontrar rápido lo que se necesita** en ellas; buscar a mano en
papel o PDF es tedioso.

## 4. Qué ayuda al escribano

1. **No recordar datos**: nombres, números de vela, barcos, representantes,
   testigos y roles, siempre a mano.
2. **Que el sistema reaccione a lo que se escribe** (sin botones ni casillas): si
   escribe que una parte no vino o que se retiró, aparece la frase hecha y la
   regla que toca. Lo común, determinista; la cola larga, IA si se pide.
3. **Subrayado de ortografía en inglés**, con vocabulario de vela permitido.
   (Corregir en bloque, más adelante.)

## 5. Cómo interactúa (decisión por confirmar con la primera versión)

Un solo punto de interacción, silencioso y que no se mueve:
- Texto del escribano en el centro; nada salta ni cambia de sitio.
- Ayuda en **una línea discreta**; Tab acepta, Esc ignora; sin ratón en vivo.
- `Ctrl+K`: buscador único sobre frases, RRS, evento y clase.
- Modo lectura limpio para la deliberación y para leer a las partes.

## 6. Principios

- **Cuanto más simple, mejor; el azúcar viene después.** Cada función nueva dice
  qué quita o simplifica.
- Nada se inserta solo. Sugerencia vacía antes que confiada e incorrecta.
- Determinista antes que IA. Nada se cita si no está en el corpus.
- **Se prueba en una audiencia real antes de añadir nada.**

## 7. Qué se reutiliza del proyecto old

Conversión PDF/Excel/Word a Markdown, corpus y búsqueda FTS5, capas permanente
y de evento, frases, extracción del protest form, login, Docker/Portainer.
Fuera de la v1: fantasma con IA, franja de propuestas, huecos de IA, avisos de
desfase, redacción nueva de IA. Se reevalúan después de probar la v1.
