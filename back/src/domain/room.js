import { InvalidActionError } from "./errors.js";
import { resolvePhaseDurations } from "./phases.js";

const DEFAULT_STARS_PER_PARTICIPANT = 5;
const MIN_STARS_PER_PARTICIPANT = 1;
const MAX_STARS_PER_PARTICIPANT = 10;

const DEFAULT_SECONDS_PER_SPEAKER = 60;
const MIN_SECONDS_PER_SPEAKER = 30;
const MAX_SECONDS_PER_SPEAKER = 300;

// Texto libre y opcional que el host pega al crear la sala (ej: las acciones
// concretas copiadas del Game Over de la retro anterior) para mostrarlo tal
// cual en el Nivel 2 (previous_action). No hay persistencia real entre
// sesiones (fuera del MVP, ver back.md sección 5) — esto es solo una forma
// manual de darle continuidad sin guardar nada entre salas distintas.
export const PREVIOUS_ACTION_NOTES_MAX_LENGTH = 2000;

export const AVATAR_IDS = [
  "afro-pelirrojo-bigote",
  "pelo-largo-lentes-sol-rojo",
  "calvo-barba-canosa-anteojos",
  "rulos-violeta-pecoso",
  "cinta-deportiva-rubio",
  "pelo-corto-pecoso-sonriente",
  "canoso-barba-naranja",
  "anteojos-marco-negro-morocha",
  "mohicano-verde-punk",
  "pelo-corto-oscuro-gorra-lateral",
  "pelirrojo-flequillo",
  "rulos-violeta-suave",
  "trenzas-rubias-cinta",
  "pelirrojo-pecoso-sonriente",
  "canoso-anteojos-sonriente",
  "pelo-negro-lentes-sol-mujer",
  "afro-magenta-anteojos",
  "calvo-barba-tatuajes-cuello",
  "afro-cian-anteojos-rosa",
  "gorra-roja-pecoso",
  "canoso-auriculares-sonriente",
  "rubio-lentes-sol-clasico",
  "pelo-negro-aros-coloridos",
  "afro-magenta-sonriente",
  "calvo-barba-aros-tatuajes",
  "afro-celeste-anteojos-rosados",
  "cresta-celeste-goblin",
  "pelo-rosa-largo-choker",
  "gorra-violeta-pecoso-sonriente",
  "cresta-violeta-sonriente",
  "calvo-barba-collar-tribal",
  "afro-celeste-anteojos-rosa-oscuro",
  "pelo-rosa-choker-mujer",
  "mascara-oscura-ojos-brillantes",
  "afro-violeta-oscuro",
  "gorro-celeste-piel-verde",
  "pelo-castano-aros-coloridos",
  "orco-verde-anteojos-rosa",
  "lentes-sol-negro-barba",
  "anteojos-marco-gris-bigote",
  "trenzas-largas-sonriente",
  "pelo-castano-corto-anteojos-mujer",
  "gorro-lana-canoso-anteojos",
  "lentes-sol-negro-gorra-atras",
  "canoso-anteojos-barba-blanca",
  "lentes-sol-barba-negra",
  "anteojos-marco-gris-sport",
  "trenzas-negras-sonriente",
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

export function resolvePreviousActionNotes(value) {
  if (value === undefined || value === null) return "";
  const trimmed = String(value).trim();
  if (trimmed.length > PREVIOUS_ACTION_NOTES_MAX_LENGTH) {
    throw new InvalidActionError(
      "room:create",
      `previousActionNotes no puede superar los ${PREVIOUS_ACTION_NOTES_MAX_LENGTH} caracteres`
    );
  }
  return trimmed;
}

export function createRoom({
  code,
  hostId,
  hostName,
  phaseDurations,
  starsPerParticipant,
  secondsPerSpeaker,
  avatarId,
  previousActionNotes,
  now,
}) {
  if (!hostName || !hostName.trim()) {
    throw new InvalidActionError("room:create", "hostName no puede estar vacío");
  }

  const resolvedDurations = resolvePhaseDurations(phaseDurations);
  const resolvedStars = resolveStarsPerParticipant(starsPerParticipant);
  const resolvedSecondsPerSpeaker = resolveSecondsPerSpeaker(secondsPerSpeaker);
  const resolvedPreviousActionNotes = resolvePreviousActionNotes(previousActionNotes);

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
    previousActionNotes: resolvedPreviousActionNotes,
    createdAt: now,
  };
}
