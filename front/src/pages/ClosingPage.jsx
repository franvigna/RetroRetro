import { useNavigate } from "react-router-dom";
import { useRoom } from "../context/RoomContext.jsx";
import { PHASE_THEMES } from "../domain/phaseThemes.js";

export function ClosingPage() {
  const { room, leaveRoom } = useRoom();
  const navigate = useNavigate();
  const theme = PHASE_THEMES.closing;

  function handleBackToStart() {
    leaveRoom();
    navigate("/");
  }

  const actionCards = room.cards.filter((c) => c.column === "action_plan");
  const participantsById = Object.fromEntries(room.participants.map((p) => [p.id, p]));

  return (
    <div className="page page-wide">
      <h1 className="brand-title pixel-text">{theme.title}</h1>
      <p className="brand-tagline">{theme.subtitle}</p>

      <div className="cabinet" style={{ width: "100%" }}>
        <div className="cabinet-bezel" />
        <h2 className="cabinet-title">PLAN DE ACCIÓN CONSOLIDADO</h2>

        {actionCards.length === 0 ? (
          <p className="field-help">No se guardaron acciones en esta partida.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {actionCards.map((card) => {
              const assigneeNames = (card.assigneeIds || []).map((id) => participantsById[id]?.name || "?");
              return (
                <li key={card.id} className="card-item">
                  <span className="card-item-title">{card.title}</span>
                  {card.description && <span className="card-item-text">{card.description}</span>}
                  {assigneeNames.length > 0 && (
                    <span className="card-item-assignees">Responsables: {assigneeNames.join(", ")}</span>
                  )}
                  <div className="card-item-footer">
                    <span>{participantsById[card.authorId]?.name || "Anónimo"}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <button type="button" className="btn btn-primary btn-block" style={{ marginTop: "1.5rem" }} onClick={handleBackToStart}>
          ▶ Volver al inicio
        </button>
      </div>
    </div>
  );
}
