import { InvalidActionError } from "./errors.js";

export function setSpeaker(room, { participantId }) {
  const exists = room.participants.some((p) => p.id === participantId);
  if (!exists) {
    throw new InvalidActionError("turn:set_speaker", "el participante no existe en la sala");
  }
  return {
    ...room,
    currentSpeakerId: participantId,
    speakerTimer: { status: "running", remainingSeconds: room.secondsPerSpeaker },
  };
}

export function clearSpeaker(room) {
  return { ...room, currentSpeakerId: null, speakerTimer: null };
}

// Rota al siguiente participante en el orden de room.participants (wraparound:
// después del último vuelve al primero). Si no hay orador actual, arranca por
// el primero. Usado tanto por la rotación automática del servidor (al llegar
// speakerTimer a 0) como por el evento turn:advance (ver back.md HU-B07).
export function advanceSpeaker(room) {
  if (room.participants.length === 0) return room;

  const currentIndex = room.participants.findIndex((p) => p.id === room.currentSpeakerId);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % room.participants.length;
  const nextSpeaker = room.participants[nextIndex];

  return setSpeaker(room, { participantId: nextSpeaker.id });
}

// Mismo patrón que domain/timer.js: tick(). No hace nada si no está running.
export function tickSpeakerTimer(speakerTimer) {
  if (!speakerTimer || speakerTimer.status !== "running") return speakerTimer;
  const remainingSeconds = Math.max(0, speakerTimer.remainingSeconds - 1);
  return { ...speakerTimer, remainingSeconds };
}
