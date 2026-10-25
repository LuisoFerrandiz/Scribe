# SPEC-001 — v1 del escribano: una pantalla, un documento, una ayuda

Estado: v2 (tras revisión QA: 5 bloqueantes e importantes recogidos). Brújula: `VISION.md`.

## Problema

La primera versión (`Scribe_helper_old`) no se pudo usar en un evento real. El escribano redacta
hechos, conclusiones y decisión **en vivo**, con la atención en la audiencia; la app le pedía
saltar entre nueve pestañas, mirar una franja de tarjetas, un menú, avisos y bandejas.

## Objetivo de la v1

Escribir una decisión completa **en una audiencia real** con tres ayudas y nada más: datos a mano,
una sugerencia discreta y un buscador. Se prueba en una audiencia real antes de añadir nada.

## Requisitos

- **RF-001 Caso.** Un caso tiene: evento (se elige o se crea con nombre y zona horaria al dar de alta
  el caso), número de caso (único por evento), tipos (protesta, reparación, reapertura; uno o
  varios), fecha y hora de la audiencia (en la zona del evento) y **N partes** (1 a 60+). Cada parte:
  rol (protestante, protestado, otra), nombre, barco, número de vela. Testigos: nombre y parte a la
  que apoyan (opcional). Una lista plana, sin pestañas; una parte puede estar vacía de datos
  (no compareció).
- **RF-002 Protest form.** Subir uno o varios protest forms (PDF, Word, Excel, Markdown), convertidos
  a Markdown (ingestión del old). La extracción devuelve **solo** partes (con rol), número de caso
  y tipo de reclamación, como **propuesta** que el escribano revisa y acepta; nada se guarda sin
  aceptar. Sin clave o con fallo de IA, se teclea a mano y todo lo demás funciona. La extracción no
  rellena ninguna sección del documento.
- **RF-003 Documento continuo.** Una página, cinco secciones apiladas: Procedural Matters, Facts
  Found, Conclusion, Rules Applicable, Decision. Sin pestañas. Cabecera fija y compacta con los
  datos del caso; con muchas partes muestra "Parties (N)" desplegable. Guardado automático al
  servidor (debounce 1 s) más borrador local. **Indicador de estado visible y discreto**:
  "Saved", "Saving…", "Offline – will retry" y "Not saved" si falla; reintento automático al volver
  la red. Al reabrir, si el borrador local es más reciente que el servidor, gana el local y se guarda.
- **RF-004 Datos a mano.** Al teclear ≥2 caracteres del comienzo de un nombre, barco o número de vela
  del caso, si **exactamente un** candidato encaja aparece una sugerencia en línea; Tab la acepta,
  Esc la descarta. Si encajan varios no se muestra nada hasta que lo escrito deja uno. Sin IA ni red.
- **RF-005 Una línea de sugerencia.** Bajo la sección activa, una línea de altura fija con como
  mucho **una** frase de la librería o **una** cita de regla del corpus. Texto de consulta: lo
  escrito desde el último punto/salto de línea hasta el cursor, máximo 12 palabras. Se actualiza
  ~600 ms tras dejar de teclear. Una frase solo se muestra si comparte ≥2 palabras significativas
  (sin palabras vacías) con la consulta; una cita solo si el número de regla o ≥2 palabras
  significativas aparecen en el texto de la sección. Si no, la línea queda vacía. En Rules Applicable
  solo hay citas (la librería de frases no tiene esa caja). Tab inserta en el cursor **solo si hay
  sugerencia visible** (si no, Tab es el de siempre); Esc descarta. Sin interruptor global.
- **RF-006 Buscador `Ctrl+K`.** Cuadro único que busca a la vez en frases, RRS y documentos de
  evento (NoR, SIs, reglas de clase y sus enmiendas). Cada fuente se consulta por separado y se
  muestran como mucho 5 de cada una, con tipo y documento visibles; Enter inserta en el cursor sin
  reemplazar la selección (frase: su texto; regla: su cita con el número exacto del corpus); Esc
  cierra y devuelve el foco y el cursor al punto anterior. Nunca se inserta una referencia que no
  exista en el corpus.
- **RF-007 Ortografía.** Subrayado en inglés con el corrector del navegador (`lang="en"`). Sin
  diccionario propio; los términos de vela se añaden al diccionario del navegador.
- **RF-008 Modo lectura.** `F2` alterna una vista limpia, grande y de solo lectura con las secciones
  en orden; al volver se restaura la sección y la posición del cursor.
- **RF-009 Copiar y respaldo.** Copiar una sección, copiar todo, y **descargar .txt** del caso
  completo. La cabecera de partes del texto copiado es un bloque de texto simple (rol: nombre,
  barco, vela). Sirve de plan B si falla el servidor.
- **RF-010 Acceso.** Un usuario con login (autenticación del old).
- **RF-011 Operación.** Stack nuevo en Docker/Portainer con puertos y volumen propios.
- **RF-012 Dos pestañas.** Cada guardado lleva el `updated_at` conocido; si el servidor tiene uno
  más nuevo responde 409 y la página avisa una vez y recarga el texto del servidor sin perder el
  borrador local (queda como copia).

Fuera de la v1 (se reevalúa tras probar): texto fantasma de IA, propuestas/huecos/redacción con IA,
ejemplos de decisiones, jurado, avisos de coherencia, diccionario propio o corrección en bloque,
plantillas propias de reparación/reapertura (el tipo solo se registra), multiusuario.

## Restricciones heredadas

Nada se cita que no esté en el corpus; nada se inserta sin una acción explícita; sugerencia vacía
antes que incorrecta; la API key nunca llega al navegador; todos los datos bajo `data/`; sin datos
reales de competidores en el repo.

## Casos límite

- 1 o 60 partes: la cabecera se pliega; autocompletado (RF-004) localiza cualquier parte.
- Parte que no compareció: parte sin datos.
- Retirada o penalización: no hay campo; se escribe y RF-005/RF-006 ofrecen frase y regla si existen.
- Sin conexión: todo funciona salvo la extracción del protest form.
- Ctrl+K con texto seleccionado: la selección no se reemplaza.

## Criterios de aceptación

1. Protest form real a caso con partes cargadas **en menos de 2 minutos de trabajo del escribano**
   (la espera de la IA no cuenta).
2. Una decisión de principio a fin **sin cambiar de pantalla**; el ratón solo se usa fuera de la
   escritura (alta del caso, aceptar la propuesta).
3. 2 letras de una parte o vela ofrecen el dato correcto cuando solo una lo cumple.
4. `Ctrl+K` + 3 palabras muestra frase y regla en menos de 2 s con el servidor local.
5. La línea de sugerencia no cambia el alto ni la posición de lo que se escribe.
6. `F2` y vuelta restauran sección y cursor.
7. Cerrar y reabrir el navegador, y cortar la red 1 minuto y restaurarla, no pierde nada.
8. Una audiencia real; lo que falle se anota y se corrige antes de añadir ninguna función.
