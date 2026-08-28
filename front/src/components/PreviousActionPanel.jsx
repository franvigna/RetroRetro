// Nivel 2 (previous_action) — repaso de la retro anterior. No hay
// persistencia real entre sesiones (fuera del MVP, ver back.md sección 5): el
// contenido es el texto libre que el host pegó al crear la sala
// (room.previousActionNotes), mostrado tal cual, más una guía para la
// conversación oral del equipo.
export function PreviousActionPanel({ notes }) {
  return (
    <div className="previous-action-panel">
      <p>
        Antes de arrancar: un momento para repasar entre todos qué quedó pendiente de la última
        partida, si la hubo.
      </p>
      {notes ? (
        <div className="previous-action-notes">
          <p className="previous-action-notes-label">Lo que quedó pendiente:</p>
          <p className="previous-action-notes-text">{notes}</p>
        </div>
      ) : (
        <p className="field-help">
          El anfitrión no cargó ningún pendiente de la retro anterior al crear esta sala.
        </p>
      )}
    </div>
  );
}
