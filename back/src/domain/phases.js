import { InvalidActionError } from "./errors.js";

// Orden real del flujo de juego, incluye waiting_room y closing que no tienen timer.
export const PHASE_ORDER = [
  "waiting_room",
  "welcome",
  "previous_action",
  "keep_improve_try",
  "expression_round",
  "grouping_voting",
  "hall_of_fame",
  "action_plan",
  "closing",
];

// Fases con timer configurable por el host (ver HU-B09 en back.md).
// expression_round NO tiene timer de fase — usa speakerTimer/secondsPerSpeaker
// en su lugar (rotación automática por orador, ver back.md HU-B07).
export const TIMED_PHASES = [
  "welcome",
  "previous_action",
  "keep_improve_try",
  "grouping_voting",
  "hall_of_fame",
  "action_plan",
];

export const DEFAULT_PHASE_DURATIONS_SECONDS = {
  welcome: 180,
  previous_action: 300,
  keep_improve_try: 900,
  grouping_voting: 600,
  hall_of_fame: 600,
  action_plan: 900,
};

const MIN_PHASE_DURATION_SECONDS = 60;
const MAX_PHASE_DURATION_SECONDS = 3600;

export function resolvePhaseDurations(partial = {}) {
  const resolved = { ...DEFAULT_PHASE_DURATIONS_SECONDS };
  for (const phase of TIMED_PHASES) {
    if (partial[phase] === undefined) continue;
    const value = partial[phase];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new InvalidActionError("room:create", `phaseDurations.${phase} debe ser un número`);
    }
    if (value < MIN_PHASE_DURATION_SECONDS || value > MAX_PHASE_DURATION_SECONDS) {
      throw new InvalidActionError(
        "room:create",
        `phaseDurations.${phase} debe estar entre ${MIN_PHASE_DURATION_SECONDS} y ${MAX_PHASE_DURATION_SECONDS} segundos`
      );
    }
    resolved[phase] = value;
  }
  return resolved;
}

function timerForPhase(phase, phaseDurations) {
  if (!TIMED_PHASES.includes(phase)) {
    return { status: "idle", durationSeconds: 0, remainingSeconds: 0 };
  }
  const durationSeconds = phaseDurations[phase];
  return { status: "running", durationSeconds, remainingSeconds: durationSeconds };
}

export function startSession(room) {
  if (room.phase !== "waiting_room") {
    throw new InvalidActionError("phase:start_session", "la sesión ya fue iniciada");
  }
  return advanceTo(room, "welcome");
}

export function advancePhase(room) {
  const currentIndex = PHASE_ORDER.indexOf(room.phase);
  if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
    throw new InvalidActionError("phase:advance", "no hay una fase siguiente");
  }
  const nextPhase = PHASE_ORDER[currentIndex + 1];
  return advanceTo(room, nextPhase);
}

export function goBackPhase(room) {
  if (room.phaseHistory.length === 0) {
    throw new InvalidActionError("phase:go_back", "no hay una fase anterior");
  }
  const previousPhase = room.phaseHistory[room.phaseHistory.length - 1];
  return {
    ...room,
    phase: previousPhase,
    phaseHistory: room.phaseHistory.slice(0, -1),
    timer: timerForPhase(previousPhase, room.phaseDurations),
    // Limpieza del mini-timer de rotación del Nivel 4 al cambiar de fase (ver
    // advanceTo más abajo) — el handler de socket es quien detiene el loop real.
    speakerTimer: null,
  };
}

function advanceTo(room, nextPhase) {
  return {
    ...room,
    phase: nextPhase,
    phaseHistory: [...room.phaseHistory, room.phase],
    timer: timerForPhase(nextPhase, room.phaseDurations),
    // currentSpeakerId no se resetea automáticamente en transiciones de fase — solo
    // turn:set_speaker/turn:clear_speaker lo modifican (contrato explícito, ver back.md HU-B09).
    // speakerTimer sí se limpia siempre al cambiar de fase (entrando o saliendo de
    // expression_round) — el host tiene que marcar manualmente al primer orador
    // de cada nueva sesión de Nivel 4, nunca arranca a rotar solo sin que nadie
    // haya sido marcado (ver back.md HU-B07).
    speakerTimer: null,
  };
}
