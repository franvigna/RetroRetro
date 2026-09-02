import { useEffect } from "react";
import { playBeep } from "../utils/beep.js";
import { getAvatarById } from "../domain/avatars.js";
import type { Participant } from "../domain/types.js";

// Deriva quién habla después del orador actual, en el mismo orden que usa el
// servidor en domain/turns.ts: advanceSpeaker() (wraparound por índice en
// room.participants). Es una lectura pura de datos ya recibidos, no una
// decisión de negocio — el servidor sigue siendo quien realmente rota.
function getNextSpeaker(participants: Participant[], currentSpeakerId: string | null): Participant | null {
  if (!participants || participants.length === 0) return null;
  const currentIndex = participants.findIndex((p) => p.id === currentSpeakerId);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % participants.length;
  return participants[nextIndex];
}

interface SpeakerRotationWarningProps {
  participants: Participant[];
  currentSpeakerId: string | null;
  remainingSeconds: number;
}

// Aviso de "faltan 5 segundos" durante expression_round: cuenta regresiva
// grande + nombre de quién sigue, con beep. Sin botones — la rotación la
// maneja el servidor solo (ver shared-contract.md "Rotación automática del
// Nivel 4").
export function SpeakerRotationWarning({ participants, currentSpeakerId, remainingSeconds }: SpeakerRotationWarningProps) {
  const nextSpeaker = getNextSpeaker(participants, currentSpeakerId);
  const nextAvatar = nextSpeaker ? getAvatarById(nextSpeaker.avatarId) : null;

  useEffect(() => {
    playBeep({ frequency: 660, durationMs: 120 });
  }, [remainingSeconds]);

  return (
    <div className="speaker-rotation-warning" role="alert">
      <p className="speaker-rotation-countdown">{remainingSeconds}</p>
      {nextSpeaker && (
        <p className="speaker-rotation-next">
          {nextAvatar && <img src={nextAvatar.src} alt="" width="20" height="20" className="participant-avatar" />}
          Sigue: {nextSpeaker.name}
        </p>
      )}
    </div>
  );
}
