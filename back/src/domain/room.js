import { randomUUID } from "node:crypto";
import { InvalidActionError } from "./errors.js";
import { resolvePhaseDurations } from "./phases.js";

const DEFAULT_STARS_PER_PARTICIPANT = 5;
const MIN_STARS_PER_PARTICIPANT = 1;
const MAX_STARS_PER_PARTICIPANT = 10;

const DEFAULT_SECONDS_PER_SPEAKER = 90;
const MIN_SECONDS_PER_SPEAKER = 30;
const MAX_SECONDS_PER_SPEAKER = 300;

// Texto libre y opcional que el host pega al crear la sala (ej: las acciones
// concretas copiadas del Game Over de la retro anterior) para mostrarlo tal
// cual en el Nivel 2 (previous_action). No hay persistencia real entre
// sesiones (fuera del MVP, ver back.md sección 5) — esto es solo una forma
// manual de darle continuidad sin guardar nada entre salas distintas.
export const PREVIOUS_ACTION_NOTES_MAX_LENGTH = 2000;

// Nombre de equipo opcional que el host completa al crear la sala, para
// identificar de qué equipo es esa retro puntual (ej: "Jaliscom"). Se
// muestra en el header de cada nivel y en el título del PDF exportado. Vacío
// por defecto — la app se ve exactamente igual que sin esta feature.
export const TEAM_NAME_MAX_LENGTH = 60;

// Espejo de front/src/domain/avatars.js. Generados con la herramienta
// interna Avatar Lab (front/src/pages/AvatarLabPage.jsx) a partir de fotos
// reales del equipo Jaliscom. Al sumar uno nuevo, agregar el mismo id acá y
// en requirements/shared-contract.md sección 1.
export const AVATAR_IDS = ["cisco", "licha", "juampy", "mili", "agus", "sergio"];

// avatarId es cosmético y opcional: un valor ausente o inválido nunca rechaza
// room:create/room:join, simplemente se guarda como null (ver back.md HU-B01b).
export function resolveAvatarId(value) {
  return AVATAR_IDS.includes(value) ? value : null;
}

export function resolveStarsPerParticipant(value, action = "room:create") {
  if (value === undefined) return DEFAULT_STARS_PER_PARTICIPANT;
  if (!Number.isInteger(value) || value < MIN_STARS_PER_PARTICIPANT || value > MAX_STARS_PER_PARTICIPANT) {
    throw new InvalidActionError(
      action,
      `starsPerParticipant debe ser un entero entre ${MIN_STARS_PER_PARTICIPANT} y ${MAX_STARS_PER_PARTICIPANT}`
    );
  }
  return value;
}

// room:update_settings (ver back.md, panel de configuración del host): a
// diferencia de room:create, acá starsPerParticipant es obligatorio — no
// tiene sentido "no cambiar nada" en un evento de actualización — y no toca
// los votos ya emitidos (ver domain/cards.js, toggleVote sigue validando solo
// al AGREGAR un voto nuevo: alguien que ya usó más estrellas que el nuevo
// máximo queda "sobregirado" sin que se le borre nada, decisión de producto
// para no mover resultados de la votación sin que la persona lo decida).
export function updateRoomSettings(room, { starsPerParticipant }) {
  if (starsPerParticipant === undefined) {
    throw new InvalidActionError("room:update_settings", "starsPerParticipant es obligatorio");
  }
  const resolvedStars = resolveStarsPerParticipant(starsPerParticipant, "room:update_settings");
  return { ...room, starsPerParticipant: resolvedStars };
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

export function resolveTeamName(value) {
  if (value === undefined || value === null) return "";
  const trimmed = String(value).trim();
  if (trimmed.length > TEAM_NAME_MAX_LENGTH) {
    throw new InvalidActionError("room:create", `teamName no puede superar los ${TEAM_NAME_MAX_LENGTH} caracteres`);
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
  teamName,
  now,
}) {
  if (!hostName || !hostName.trim()) {
    throw new InvalidActionError("room:create", "hostName no puede estar vacío");
  }

  const resolvedDurations = resolvePhaseDurations(phaseDurations);
  const resolvedStars = resolveStarsPerParticipant(starsPerParticipant);
  const resolvedSecondsPerSpeaker = resolveSecondsPerSpeaker(secondsPerSpeaker);
  const resolvedPreviousActionNotes = resolvePreviousActionNotes(previousActionNotes);
  const resolvedTeamName = resolveTeamName(teamName);

  return {
    code,
    hostId,
    phase: "waiting_room",
    phaseHistory: [],
    timer: { status: "idle", durationSeconds: 0, remainingSeconds: 0 },
    participants: [
      {
        id: hostId,
        name: hostName.trim(),
        role: "host",
        connected: true,
        avatarId: resolveAvatarId(avatarId),
        sessionToken: generateSessionToken(),
      },
    ],
    cards: [],
    phaseDurations: resolvedDurations,
    starsPerParticipant: resolvedStars,
    currentSpeakerId: null,
    secondsPerSpeaker: resolvedSecondsPerSpeaker,
    speakerTimer: null,
    previousActionNotes: resolvedPreviousActionNotes,
    teamName: resolvedTeamName,
    // Estado efímero de los tildes del Nivel 2 (ver domain/previousAction.js)
    // — { [índice de línea]: boolean }. Igual que el resto de la sala, no
    // persiste entre sesiones.
    previousActionChecks: {},
    createdAt: now,
  };
}

// Credencial secreta de reconexión de un participante — nunca el nombre
// tipeado, que cualquiera puede repetir (ver room:join en roomHandlers.js:
// antes reconectaba por `name === name` sin más chequeo, lo que permitía
// entrar como cualquiera, incluido el host, con solo escribir su nombre
// mientras estaba desconectado). Se entrega una sola vez, en privado, al
// dueño del participante (room:created/room:joined) — jamás en room:state
// ni en ningún payload que vea el resto de la sala (ver toPublicRoom).
export function generateSessionToken() {
  return randomUUID();
}

// Único punto por el que debe pasar cualquier `room` antes de salir hacia un
// socket (room:state, room:created, room:joined) — saca el sessionToken de
// cada participante para que nunca viaje a nadie más que a su dueño.
export function toPublicRoom(room) {
  return {
    ...room,
    participants: room.participants.map(({ sessionToken, ...publicFields }) => publicFields),
  };
}

// Una vez que la partida arrancó, nadie que no estuviera ya en la sala puede
// sumarse — solo reconectarse con su sessionToken quienes ya tenían un
// lugar (ver room:join en roomHandlers.js y HU-B09, ventana de gracia).
export function isRoomLockedForNewJoins(room) {
  return room.phase !== "waiting_room";
}
