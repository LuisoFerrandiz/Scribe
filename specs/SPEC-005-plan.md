# SPEC-005 — Plan

- **API/IA.** `ai/normalize.ts`: `Extraction.witnesses: string[]` (recortados, sin vacíos ni repetidos, tope 50).
  `ai/extract.ts`: `witnesses` en la forma y una frase en el sistema ("witnesses are the people the form names as
  witnesses, names only; empty list when it names none; never a guess"). Prompt: "…, parties and witnesses".
- **Web.** `types.ts` (`Extraction.witnesses`). `mergeWitnesses.ts` (`newWitnesses`, `mergeWitnesses`): nuevos por nombre
  normalizado; rellena filas vacías, el resto al final; conserva `supports_party_id`. `ProtestFormDialog`: casilla y
  lista; al aceptar `api.setWitnesses` (el PUT reemplaza la lista, por eso se envía la lista completa) y `onApply`
  con `witnesses`. `CaseView`/`useCaseDoc.updateCase` ya aceptan `witnesses`.
- **Riesgo datos.** El PUT borra y reinserta testigos: se envía siempre existentes + nuevos, en orden; nunca solo los nuevos.
- **Riesgo IA.** Confundir testigo con parte: el prompt lo prohíbe y la deduplicación por nombre contra partes no se
  hace (un nombre puede ser ambos); lo decide el escribano al aceptar.
