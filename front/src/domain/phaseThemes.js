// Fuente única de verdad del copy temático "Retro Arcade" en el frontend.
// El backend no conoce estos nombres: solo maneja los identificadores de fase
// (Phase, ver shared-contract.md). Este archivo traduce esos identificadores
// a lo que ve la persona usuaria.

export const PHASE_THEMES = {
  waiting_room: {
    title: "INSERTAR MONEDA",
    subtitle: "Sala de espera",
    description: "Esperando a que el anfitrión inicie la partida.",
  },
  welcome: {
    title: "NIVEL 1",
    subtitle: "Cómo jugar",
    description: "Bienvenida y reglas de la sesión.",
  },
  previous_action: {
    title: "NIVEL 2",
    subtitle: "Continue? (puntaje anterior)",
    description: "Repaso rápido de la última partida antes de arrancar esta.",
  },
  keep_improve_try: {
    title: "NIVEL 3",
    subtitle: "Keep, Improve, Try",
    description: "Sumá tarjetas: qué seguir haciendo, qué mejorar, qué probar.",
  },
  expression_round: {
    title: "NIVEL 4",
    subtitle: "Turno de jugador",
    description:
      "Cada participante dispone de 90 segundos para explicar sus tarjetas. Al finalizar, el turno pasa automáticamente al siguiente, aunque el anfitrión puede adaptar el orden cuando sea necesario.",
  },
  grouping_voting: {
    title: "NIVEL 5",
    subtitle: "Ranking de estrellas",
    description: "Repartí tus estrellas de puntaje entre las tarjetas que consideres más importantes.",
  },
  hall_of_fame: {
    title: "NIVEL 6",
    subtitle: "Salón de la Fama",
    description: "Las tarjetas más votadas de la partida, para discutirlas a fondo.",
  },
  action_plan: {
    title: "NIVEL 7",
    subtitle: "Guardar partida",
    description: "Definí las acciones concretas que se llevan de esta retro.",
  },
  closing: {
    title: "GAME OVER",
    subtitle: "High Score",
    description: "Plan de acción consolidado de la sesión.",
  },
};

// Valores recomendados en minutos, mostrados en el paso 2 de "Crear sala".
// Coinciden exactamente con DEFAULT_PHASE_DURATIONS_SECONDS del backend
// (welcome=180s=3min, previous_action=300s=5min, keep_improve_try=900s=15min,
// grouping_voting=600s=10min, action_plan=900s=15min). expression_round no
// tiene duración en minutos — ver DEFAULT_SECONDS_PER_SPEAKER más abajo.
export const DEFAULT_DURATIONS_MINUTES = {
  welcome: 3,
  previous_action: 5,
  keep_improve_try: 15,
  grouping_voting: 10,
  hall_of_fame: 10,
  action_plan: 15,
};

// Orden de fases con timer de duración total, tal como TIMED_PHASES en el
// backend. expression_round no está acá — usa secondsPerSpeaker en su lugar
// (rotación automática por orador, sin límite total de fase).
export const TIMED_PHASES = ["welcome", "previous_action", "keep_improve_try", "grouping_voting", "hall_of_fame", "action_plan"];

// Copy de timeboxing para el tooltip de cada input de duración (HU-F01b).
// Original del proyecto, sin citar fuentes externas de "buenas prácticas ágiles".
export const TIMEBOXING_NOTES = {
  welcome: "Recomendado: 3 min. Alcanza para marcar el tono sin robarle tiempo al resto de la partida.",
  previous_action:
    "Recomendado: 5 min. Un repaso corto evita que la retro se convierta en una segunda reunión de seguimiento.",
  keep_improve_try:
    "Recomendado: 15 min. Es el corazón de la sesión: dale aire, pero un timer visible evita que se estire sola.",
  grouping_voting:
    "Recomendado: 10 min. Votar no debería tomar más que escribir las tarjetas — si se alarga, ya eligieron.",
  hall_of_fame:
    "Recomendado: 10 min. El podio ya está armado solo — este tiempo es para discutir lo que emergió, no para votar de nuevo.",
  action_plan:
    "Recomendado: 15 min. Guardar partida sin definir acciones concretas es jugar para nada la próxima vez.",
};

export const MIN_PHASE_DURATION_MINUTES = 1;
export const MAX_PHASE_DURATION_MINUTES = 60;

export function minutesToSeconds(minutes) {
  return Math.round(minutes * 60);
}

// Nivel 4 — segundos que habla cada persona antes de rotar automáticamente
// (ver shared-contract.md "Rotación automática del Nivel 4").
export const MIN_SECONDS_PER_SPEAKER = 30;
export const MAX_SECONDS_PER_SPEAKER = 300;
export const DEFAULT_SECONDS_PER_SPEAKER = 90;

export const CARD_COLUMNS_BY_PHASE = {
  keep_improve_try: ["keep", "improve", "try"],
  action_plan: ["action_plan"],
};

export const COLUMN_LABELS = {
  keep: "Keep (Mantener)",
  improve: "Improve (Mejorar)",
  try: "Try (Intentar)",
  action_plan: "Guardar partida",
};

// Preguntas disparadoras cortas debajo de cada título de columna, para
// ayudar a arrancar a escribir sin tener que explicar la dinámica de
// memoria. Más de una por columna, cada una mirando un ángulo distinto
// (equipo/proceso, individual/colectivo), para que sirvan de gatillo aunque
// la primera no dispare nada.
export const COLUMN_PROMPTS = {
  keep: [
    "¿Qué funcionó bien y no queremos perder?",
    "¿Qué costumbre o práctica del equipo vale la pena repetir?",
  ],
  improve: [
    "¿Qué se puede mejorar?",
    "¿Qué nos generó fricción, demoras o malentendidos?",
  ],
  try: [
    "¿Qué nos gustaría probar la próxima vez?",
    "¿Hay algo nuevo (herramienta, proceso o dinámica) que queramos animarnos a probar?",
  ],
};

export const MIN_STARS_PER_PARTICIPANT = 1;
export const MAX_STARS_PER_PARTICIPANT = 10;
export const DEFAULT_STARS_PER_PARTICIPANT = 5;

// Nivel 2 (previous_action) — texto libre opcional que el host pega al crear
// la sala (ej: acciones concretas copiadas del Game Over de la retro
// anterior). Debe coincidir con PREVIOUS_ACTION_NOTES_MAX_LENGTH en
// back/src/domain/room.js.
export const PREVIOUS_ACTION_NOTES_MAX_LENGTH = 2000;
