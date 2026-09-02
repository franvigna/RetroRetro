import { useState } from "react";
import { useRoom } from "../context/RoomContext.jsx";
import { useRoomEvents } from "../hooks/useRoomEvents.js";
import { ParticipantList } from "../components/ParticipantList.jsx";
import { CopyInviteLink } from "../components/CopyInviteLink.jsx";
import { RoomSettingsPanel } from "../components/RoomSettingsPanel.jsx";
import { PHASE_THEMES } from "../domain/phaseThemes.js";

export function WaitingRoomPage() {
  const { room, currentParticipantId } = useRoom();
  const { startSession, updateRoomSettings, closeRoom } = useRoomEvents();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const me = room.participants.find((p) => p.id === currentParticipantId);
  const isHost = me?.role === "host";
  const theme = PHASE_THEMES.waiting_room;

  return (
    <div className="page page-narrow">
      <div className="btn-row" style={{ width: "100%", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          {room.teamName && <p className="team-name-tag pixel-text">EQUIPO {room.teamName.toUpperCase()}</p>}
          <h1 className="brand-title pixel-text">{theme.title}</h1>
          <p className="brand-tagline">{theme.description}</p>
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

      <div className="cabinet">
        <div className="cabinet-bezel" />
        <p className="cabinet-subtitle">Código de sala</p>
        <p className="room-code">{room.code}</p>
        <CopyInviteLink code={room.code} />

        <h2 className="cabinet-title" style={{ marginTop: "1.5rem" }}>
          JUGADORES
        </h2>
        <ParticipantList participants={room.participants} />

        {isHost && (
          <div className="host-controls">
            <button type="button" className="btn btn-primary btn-block" onClick={startSession}>
              ▶ Iniciar partida
            </button>
          </div>
        )}
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
