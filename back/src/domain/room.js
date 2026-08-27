import { InvalidActionError } from "./errors.js";
import { resolvePhaseDurations } from "./phases.js";

const DEFAULT_STARS_PER_PARTICIPANT = 3;
const MIN_STARS_PER_PARTICIPANT = 1;
const MAX_STARS_PER_PARTICIPANT = 10;

const DEFAULT_SECONDS_PER_SPEAKER = 60;
const MIN_SECONDS_PER_SPEAKER = 30;
const MAX_SECONDS_PER_SPEAKER = 300;

export const AVATAR_IDS = [
  "carpeta",
  "ventana",
  "disco",
  "terminal",
  "cd",
  "documento",
  "reloj-carga",
  "bombilla",
  "engranaje",
  "candado",
  "papelera",
  "tarjeta-perforada",
];

// avatarId es cosmético y opcional: un valor ausente o inválido nunca rechaza
// room:create/room:join, simplemente se guarda como null (ver back.md HU-B01b).
export function resolveAvatarId(value) {
  return AVATAR_IDS.includes(value) ? value : null;
}

export function resolveStarsPerParticipant(value) {
  if (value === undefined) return DEFAULT_STARS_PER_PARTICIPANT;
  if (!Number.isInteger(value) || value < MIN_STARS_PER_PARTICIPANT || value > MAX_STARS_PER_PARTICIPANT) {
    throw new InvalidActionError(
      "room:create",
      `starsPerParticipant debe ser un entero entre ${MIN_STARS_PER_PARTICIPANT} y ${MAX_STARS_PER_PARTICIPANT}`
    );
  }
  return value;
}

export function resolveSecondsPerSpeaker(value) {
  if (value === undefined) return DEFAULT_SECONDS_PER_SPEAKER;
  if (!Number.isInteger(value) || value < MIN_SECONDS_PER_SPEAKER || value > MAX_SECONDS_PER_SPEAKER) {
    throw new InvalidActionError(
      "room:create",
      `secondsPerSpeaker debe ser un entero entre ${MIN_SECONDS_PER_SPEAKER} y ${MAX_SECONDS_PER_SPEAKER}`
    );
  }
  return value;
}

export function createRoom({
  code,
  hostId,
  hostName,
  phaseDurations,
  starsPerParticipant,
  secondsPerSpeaker,
  avatarId,
  now,
}) {
  if (!hostName || !hostName.trim()) {
    throw new InvalidActionError("room:create", "hostName no puede estar vacío");
  }

  const resolvedDurations = resolvePhaseDurations(phaseDurations);
  const resolvedStars = resolveStarsPerParticipant(starsPerParticipant);
  const resolvedSecondsPerSpeaker = resolveSecondsPerSpeaker(secondsPerSpeaker);

  return {
    code,
    hostId,
    phase: "waiting_room",
    phaseHistory: [],
    timer: { status: "idle", durationSeconds: 0, remainingSeconds: 0 },
    participants: [
      { id: hostId, name: hostName.trim(), role: "host", connected: true, avatarId: resolveAvatarId(avatarId) },
    ],
    cards: [],
    phaseDurations: resolvedDurations,
    starsPerParticipant: resolvedStars,
    currentSpeakerId: null,
    secondsPerSpeaker: resolvedSecondsPerSpeaker,
    speakerTimer: null,
    createdAt: now,
  };
}
