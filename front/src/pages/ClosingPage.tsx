import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRoom } from "../context/RoomContext.tsx";
import { useRoomEvents } from "../hooks/useRoomEvents.js";
import { RoomSettingsPanel } from "../components/RoomSettingsPanel.tsx";
import { PHASE_THEMES } from "../domain/phaseThemes.js";
import { generateActionPlanPdf, buildActionPlanFilename } from "../domain/exportPdf.js";
import { getAvatarById } from "../domain/avatars.js";
import type { ParticipantsById } from "../components/CardColumn.tsx";

export function ClosingPage() {
  const { room, leaveRoom, currentParticipantId } = useRoom();
  const { goBackPhase, updateRoomSettings, closeRoom } = useRoomEvents();
  const navigate = useNavigate();
  const theme = PHASE_THEMES.closing;
  const [settingsOpen, setSettingsOpen] = useState(false);

  // RoomPage solo monta esta página cuando ya confirmó que hay un room
  // cargado que coincide con la URL — este guard es solo para que TypeScript
  // sepa lo mismo, nunca debería devolver null en la práctica.
  if (!room) return null;

  const me = room.participants.find((p) => p.id === currentParticipantId);
  const isHost = me?.role === "host";
  const canGoBack = room.phaseHistory.length > 0;

  function handleBackToStart() {
    leaveRoom();
    navigate("/");
  }

  // Alias para que el guard `if (!room) return null;` de arriba se refleje
  // en el tipo de esta closure — TS no arrastra el narrowing de una
  // variable destructurada dentro de una function declaration definida más
  // abajo, pero sí conserva el tipo real de un const nuevo como este.
  const currentRoom = room;

  function handleExportPdf() {
    const doc = generateActionPlanPdf(currentRoom);
    doc.save(buildActionPlanFilename(currentRoom));
  }

  const actionCards = room.cards.filter((c) => c.column === "action_plan");
  const participantsById: ParticipantsById = Object.fromEntries(room.participants.map((p) => [p.id, p]));

  return (
    <div className="page page-wide">
      <div className="btn-row" style={{ width: "100%", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          {room.teamName && <p className="team-name-tag pixel-text">EQUIPO {room.teamName.toUpperCase()}</p>}
          <h1 className="brand-title pixel-text">{theme.title}</h1>
          <p className="brand-tagline">{theme.subtitle}</p>
        </div>
        {isHost && (
          <button
            type="button"
            className="card-item-action-btn"
            aria-label="Configuración de la sala"
            onClick={() => setSettingsOpen(true)}
          >
            ⚙
          </button>
        )}
      </div>

      <div className="cabinet" style={{ width: "100%" }}>
        <div className="cabinet-bezel" />
        <h2 className="cabinet-title">PLAN DE ACCIÓN CONSOLIDADO</h2>

        {actionCards.length === 0 ? (
          <p className="field-help">No se guardaron acciones en esta partida.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {actionCards.map((card) => {
              const assignees = (card.assigneeIds || []).map((id) => participantsById[id] || { id, name: "?", avatarId: null });
              return (
                <li key={card.id} className="card-item">
                  <span className="card-item-title">{card.text}</span>
                  {assignees.length > 0 && (
                    <div className="card-item-assignees">
                      <span>Responsables:</span>
                      <ul className="card-item-assignee-list">
                        {assignees.map((assignee) => {
                          const avatar = getAvatarById(assignee.avatarId);
                          return (
                            <li key={assignee.id} className="card-item-assignee">
                              {avatar && (
                                <img src={avatar.src} alt="" width="18" height="18" className="participant-avatar" />
                              )}
                              {assignee.name}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          className="btn btn-secondary btn-block"
          style={{ marginTop: "1.5rem" }}
          onClick={handleExportPdf}
        >
          ⬇ Exportar PDF
        </button>

        {isHost && (
          <div className="btn-row" style={{ marginTop: "0.75rem" }}>
            <button type="button" className="btn btn-ghost" onClick={goBackPhase} disabled={!canGoBack}>
              ◀ Nivel anterior
            </button>
          </div>
        )}

        <button type="button" className="btn btn-primary btn-block" style={{ marginTop: "0.75rem" }} onClick={handleBackToStart}>
          ▶ Volver al inicio
        </button>
      </div>

      {settingsOpen && (
        <RoomSettingsPanel
          room={room}
          onUpdateSettings={updateRoomSettings}
          onCloseRoom={closeRoom}
          onDismiss={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
