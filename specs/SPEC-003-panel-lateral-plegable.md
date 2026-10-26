# SPEC-003 — Panel lateral del caso plegable

Estado: HECHA (2026-10-26). Revisada (SPEC-003-review.md, ronda 3 APROBADA) e implementada y verificada. Origen: petición del dueño al ver la pantalla de dos columnas.

## Problema

La pantalla del caso tiene dos columnas: a la izquierda el panel del caso (estado de guardado, partes, testigos,
acciones) y a la derecha el documento. En una pantalla pequeña o cuando el escribano solo quiere escribir, el panel
ocupa 17 rem que el texto podría usar. Hoy no se puede quitar.

## Objetivo

Poder **ocultar el panel izquierdo** con un clic y volver a mostrarlo, sin perder el contexto ni quitar la vista
del texto: el documento sigue en su sitio, el cursor no se mueve y el guardado sigue visible.

## Test de deriva

- ¿Quita tecleo real al escribano? No. Devuelve espacio de pantalla al texto y quita ruido visual.
- ¿Qué se quita a cambio? Solo las partes, los testigos y las acciones secundarias ("Case data", "Protest form", "Copy all"), que vuelven al desplegar. Los botones **Search** y **Reading** y el estado de guardado se quedan en la franja.
- No añade atajo de teclado nuevo, ni capas, ni ajustes: un solo botón y una preferencia recordada.

## Requisitos

- **RF-001 Plegar y desplegar.** Un botón en la cabecera del panel lo pliega a una franja estrecha (unos 3 rem). En la
  franja, un botón lo despliega. El documento ocupa todo el ancho restante.
- **RF-002 Franja útil.** Plegado, la franja muestra, de arriba abajo: el botón de desplegar, los botones **Search**
  (`Ctrl+K`) y **Reading** (`F2`) como iconos con nombre y ayuda, el indicador del estado de guardado y el número de
  caso en vertical. El estado de guardado nunca queda oculto. Saved y Saving se ven como un punto (verde, azul); los
  estados de error (Offline – will retry, Not saved) cambian además de **forma** (un "!" en vez del punto), para no
  depender solo del color.
- **RF-003 Sin quitar el foco.** Pulsar el botón no saca el cursor del texto ni cambia la selección.
- **RF-004 Se recuerda.** La preferencia (plegado o no) se guarda en este navegador y se aplica al abrir cualquier
  caso. Si el almacenamiento falla, el panel se muestra desplegado.
- **RF-005 Accesible.** El botón tiene nombre ("Hide case panel" / "Show case panel") y `aria-expanded`; el
  indicador de guardado sigue anunciándose (`role="status"`) plegado.
- **RF-006 Pantalla estrecha.** Por debajo de 900 px el panel ya va encima del documento; plegado queda como una
  barra fina con los mismos elementos.
- **RF-007 Convive con el resto.** El panel "Case data" de la derecha (si ya está abierto), `Ctrl+K`, `F2` (modo lectura) y el conflicto
  de dos pestañas funcionan igual con el panel plegado.

## Fuera de alcance

Redimensionar el panel arrastrando, atajo de teclado para plegar, plegar el panel "Case data", recordar la
preferencia en el servidor.

## Criterios de aceptación

1. Plegar y desplegar con un clic; el texto y el cursor no cambian.
2. Plegado, el estado de guardado se ve; al cortar la red el punto verde pasa a un "!" naranja, y el nombre accesible dice "Offline – will retry".
3. Recargar la página conserva la preferencia; abrir otro caso también.
4. Con el panel plegado, `Ctrl+K` y `F2` funcionan. El panel "Case data" que ya estaba abierto sigue abierto; abrirlo de nuevo requiere desplegar el panel izquierdo.
5. En 800 px de ancho no hay desbordamiento horizontal.
6. Plegado, los botones Search y Reading de la franja abren el buscador y el modo lectura y devuelven el cursor al texto.
