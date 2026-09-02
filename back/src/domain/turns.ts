import { InvalidActionError } from "./errors.js";
import type { Room, SpeakerTimerState } from "./types.js";

// participantId sin validar todavía al entrar — turn:set_speaker deja que el
// host apunte a cualquier id, y acá se valida que exista de verdad en la
// sala (ver socket/events.ts).
export function setSpeaker(room: Room, { participantId }: { participantId: unknown }): Room {
  const exists = room.participants.some((p) => p.id === participantId);
  if (!exists) {
    throw new InvalidActionError("turn:set_speaker", "el participante no existe en la sala");
  }
  return {
    ...room,
    // Seguro: `exists` solo es true si algún Participant.id (string) coincide
    // exactamente con participantId.
    currentSpeakerId: participantId as string,
    speakerTimer: { status: "running", remainingSeconds: room.secondsPerSpeaker },
  };
}

export function clearSpeaker(room: Room): Room {
  return { ...room, currentSpeakerId: null, speakerTimer: null };
}

// Rota al siguiente participante en el orden de room.participants (wraparound:
// después del último vuelve al primero). Si no hay orador actual, arranca por
// el primero. Usado tanto por la rotación automática del servidor (al llegar
// speakerTimer a 0) como por el evento turn:advance (ver back.md HU-B07).
export function advanceSpeaker(room: Room): Room {
  if (room.participants.length === 0) return room;

  const currentIndex = room.participants.findIndex((p) => p.id === room.currentSpeakerId);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % room.participants.length;
  const nextSpeaker = room.participants[nextIndex];

  return setSpeaker(room, { participantId: nextSpeaker.id });
}

// Mismo patrón que domain/timer.ts: tick(). No hace nada si no está running.
export function tickSpeakerTimer(speakerTimer: SpeakerTimerState | null): SpeakerTimerState | null {
  if (!speakerTimer || speakerTimer.status !== "running") return speakerTimer;
  const remainingSeconds = Math.max(0, speakerTimer.remainingSeconds - 1);
  return { ...speakerTimer, remainingSeconds };
}
