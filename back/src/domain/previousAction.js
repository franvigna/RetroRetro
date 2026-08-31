import { InvalidActionError } from "./errors.js";

// Nivel 2 (previous_action): cada línea no vacía de previousActionNotes se
// trata como un ítem tildable durante la charla del equipo — es solo una
// ayuda visual en vivo, no un registro real (no persiste entre sesiones,
// igual que el resto del estado de la sala, ver back.md sección 5).
export function previousActionLineCount(previousActionNotes) {
  return previousActionNotes
    .split("\n")
    .filter((line) => line.trim().length > 0).length;
}

// `done` es explícito (no un toggle ciego) porque la UI tiene dos botones
// separados — ✓ "cumplido" y ✕ "no cumplido" — en vez de uno solo que
// alterna: tocar el botón que ya representa el estado actual no debe invertirlo.
export function setPreviousActionItem(room, { index, done }) {
  const lineCount = previousActionLineCount(room.previousActionNotes);
  if (!Number.isInteger(index) || index < 0 || index >= lineCount) {
    throw new InvalidActionError("phase:set_previous_action_item", `índice fuera de rango: ${index}`);
  }
  if (typeof done !== "boolean") {
    throw new InvalidActionError("phase:set_previous_action_item", "done debe ser un booleano");
  }

  const current = room.previousActionChecks ?? {};
  const nextChecks = { ...current, [index]: done };
  return { ...room, previousActionChecks: nextChecks };
}
