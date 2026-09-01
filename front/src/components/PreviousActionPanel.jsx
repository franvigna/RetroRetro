// Nivel 2 (previous_action) — repaso de la retro anterior. No hay
// persistencia real entre sesiones (fuera del MVP, ver back.md sección 5): el
// contenido es el texto libre que el host pegó al crear la sala
// (room.previousActionNotes), mostrado como una lista de ítems marcables.
//
// El estado de cada ítem (previousActionChecks) es solo una ayuda visual
// para la charla EN VIVO del equipo — se sincroniza entre todos por socket
// (cualquier participante puede marcarlo, no es host-only), pero se pierde
// igual que el resto del estado al cerrar la sala. El índice de cada línea se
// calcula igual que en el backend (ver domain/previousAction.js): separar por
// "\n" y quedarse con las líneas no vacías, en orden.
//
// Dos botones separados (✓ / ✕): cada uno selecciona su estado y, si se
// vuelve a tocar el que ya está activo, envía null para volver a "sin marcar".
export function previousActionLines(notes) {
  return (notes || "").split("\n").filter((line) => line.trim().length > 0);
}

export function PreviousActionPanel({ notes, checks = {}, onSetItem, canToggle = false }) {
  const lines = previousActionLines(notes);

  return (
    <div className="previous-action-panel">
      <p>
        Antes de arrancar: un momento para repasar entre todos qué quedó pendiente de la última
        partida, si la hubo.
      </p>
      {lines.length > 0 ? (
        <div className="previous-action-notes">
          <p className="previous-action-notes-label">Lo que quedó pendiente:</p>
          <ul className="previous-action-list">
            {lines.map((line, index) => {
              const done = checks[index] === true;
              const notDone = checks[index] === false;
              const status = done ? "done" : notDone ? "not_done" : "pending";
              return (
                <li key={index} className="previous-action-item" data-status={status}>
                  <span className="previous-action-item-text">{line.replace(/^-\s*/, "")}</span>
                  <div className="previous-action-item-buttons">
                    <button
                      type="button"
                      className="previous-action-toggle previous-action-toggle-no"
                      aria-label="Marcar como no cumplido"
                      aria-pressed={notDone}
                      disabled={!canToggle}
                      onClick={() => onSetItem?.(index, notDone ? null : false)}
                    >
                      ✕
                    </button>
                    <button
                      type="button"
                      className="previous-action-toggle previous-action-toggle-yes"
                      aria-label="Marcar como cumplido"
                      aria-pressed={done}
                      disabled={!canToggle}
                      onClick={() => onSetItem?.(index, done ? null : true)}
                    >
                      ✓
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="field-help">
          El anfitrión no cargó ningún pendiente de la retro anterior al crear esta sala.
        </p>
      )}
    </div>
  );
}
