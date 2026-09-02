import { useState } from "react";
import { StarsSliderInput } from "./StarsSliderInput.tsx";
import { CopyInviteLink } from "./CopyInviteLink.tsx";
import { formatMinutesAsHours } from "../utils/formatTime.js";
import { TIMED_PHASES, PHASE_THEMES } from "../domain/phaseThemes.js";
import type { Room } from "../domain/types.js";

interface RoomSettingsPanelProps {
  room: Room;
  onUpdateSettings: (starsPerParticipant: number) => void;
  onCloseRoom: () => void;
  onDismiss: () => void;
}

// Panel de configuración del anfitrión (ver back.md, "panel de configuración
// del host"): accesible desde cualquier nivel, no solo la sala de espera.
// Las duraciones de fase y segundos por orador son de SOLO LECTURA acá a
// propósito — quedan fijas desde room:create para no tener que resolver qué
// pasa con un timer ya corriendo a mitad de una fase (decisión de producto).
// Solo starsPerParticipant se puede ajustar en caliente (room:update_settings).
export function RoomSettingsPanel({ room, onUpdateSettings, onCloseRoom, onDismiss }: RoomSettingsPanelProps) {
  const [stars, setStars] = useState(room.starsPerParticipant);
  const [confirmingClose, setConfirmingClose] = useState(false);

  function handleSave() {
    if (stars !== room.starsPerParticipant) {
      onUpdateSettings(stars);
    }
  }

  function handleConfirmClose() {
    onCloseRoom();
  }

  return (
    <div className="room-settings-overlay" role="dialog" aria-modal="true" aria-label="Configuración de la sala">
      <div className="cabinet room-settings-panel">
        <div className="cabinet-bezel" />
        <div className="btn-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="cabinet-title" style={{ margin: 0 }}>
            CONFIGURACIÓN
          </h2>
          <button type="button" className="card-item-action-btn" aria-label="Cerrar" onClick={onDismiss}>
            ✕
          </button>
        </div>

        <p className="cabinet-subtitle">Código de sala</p>
        <p className="room-code">{room.code}</p>
        <CopyInviteLink code={room.code} />

        <div className="field" style={{ marginTop: "1.25rem" }}>
          <StarsSliderInput value={stars} onChange={setStars} />
          {stars !== room.starsPerParticipant && (
            <button type="button" className="btn btn-secondary btn-block" onClick={handleSave}>
              Guardar cambio de estrellas
            </button>
          )}
        </div>

        <div className="room-settings-readonly">
          <p className="previous-action-notes-label">Duración de niveles (fija desde la creación):</p>
          <ul className="room-settings-durations-list">
            {TIMED_PHASES.map((phase) => (
              <li key={phase}>
                {PHASE_THEMES[phase].title} — {PHASE_THEMES[phase].subtitle}:{" "}
                {formatMinutesAsHours(Math.round(room.phaseDurations[phase] / 60))}
              </li>
            ))}
            <li>
              {PHASE_THEMES.expression_round.title} — {PHASE_THEMES.expression_round.subtitle}:{" "}
              {room.secondsPerSpeaker} segundos por persona
            </li>
          </ul>
        </div>

        <div className="room-settings-danger-zone">
          {confirmingClose ? (
            <>
              <p className="field-error">
                Esto cierra la sala para todo el equipo ahora mismo, sin posibilidad de deshacerlo.
                ¿Confirmás?
              </p>
              <div className="btn-row">
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmingClose(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-danger" onClick={handleConfirmClose}>
                  Sí, finalizar sala
                </button>
              </div>
            </>
          ) : (
            <button type="button" className="btn btn-danger btn-block" onClick={() => setConfirmingClose(true)}>
              Finalizar sala
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
