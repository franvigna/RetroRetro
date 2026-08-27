import { formatTime } from "../utils/formatTime.js";

// Lista de participantes del Nivel 4 (Turno de jugador / expression_round).
// Sin tarjetas ni formularios: es un apoyo visual a una conversación hablada
// fuera de la app (ver HU-F06/HU-F08 en front.md).
//
// Rotación automática (ver shared-contract.md): cada orador tiene un
// mini-timer (speakerTimer) que corre en el servidor y rota solo al llegar a
// 0. Modo host: tocar cualquier participante en cualquier momento marca
// turn:set_speaker y reinicia ese timer para esa persona (incluso a mitad del
// turno de otro); volver a tocar al ya marcado hace toggle a
// turn:clear_speaker. Modo participante: solo lectura, cero controles — el
// resaltado y el timer siguen lo que llega en room:state, nunca se calculan
// en cliente.
export function SpeakerList({ participants, currentSpeakerId, speakerTimer, isHost, onSetSpeaker, onClearSpeaker }) {
  if (!participants || participants.length === 0) {
    return <p className="field-help">Todavía no hay nadie en la sala.</p>;
  }

  function handleClick(participantId) {
    if (!isHost) return;
    if (participantId === currentSpeakerId) {
      onClearSpeaker();
    } else {
      onSetSpeaker(participantId);
    }
  }

  return (
    <ul className="speaker-list">
      {participants.map((p) => {
        const isSpeaking = p.id === currentSpeakerId;
        const content = (
          <>
            <span className="speaker-item-name">{p.name}</span>
            {p.role === "host" && <span className="participant-badge">HOST</span>}
            {isSpeaking && speakerTimer && (
              <span className="speaker-item-timer" aria-label={`Tiempo restante: ${formatTime(speakerTimer.remainingSeconds)}`}>
                {formatTime(speakerTimer.remainingSeconds)}
              </span>
            )}
            {isSpeaking && (
              <span className="speaker-item-icon" aria-hidden="true">
                🎤
              </span>
            )}
          </>
        );

        if (isHost) {
          return (
            <li key={p.id}>
              <button
                type="button"
                className="speaker-item speaker-item-button"
                data-speaking={String(isSpeaking)}
                data-connected={String(p.connected)}
                onClick={() => handleClick(p.id)}
                aria-pressed={isSpeaking}
              >
                {content}
              </button>
            </li>
          );
        }

        return (
          <li
            key={p.id}
            className="speaker-item"
            data-speaking={String(isSpeaking)}
            data-connected={String(p.connected)}
          >
            {content}
          </li>
        );
      })}
    </ul>
  );
}
