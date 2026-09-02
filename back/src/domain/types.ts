// Tipos canónicos del estado de una sala. Antes vivían solo como comentarios
// estilo TypeScript en requirements/shared-contract.md — esa sigue siendo la
// fuente de verdad para front (todavía en JS) y para la documentación del
// protocolo de eventos, pero acá pasan a ser código real que el compilador
// verifica en el resto de domain/.

export type Role = "host" | "participant";

export type Phase =
  | "waiting_room"
  | "welcome"
  | "previous_action"
  | "keep_improve_try"
  | "expression_round"
  | "grouping_voting"
  | "hall_of_fame"
  | "action_plan"
  | "closing";

// Fases con timer de duración total configurable por el host (ver
// domain/phases.js, TIMED_PHASES). expression_round no está acá — usa
// speakerTimer/secondsPerSpeaker en su lugar.
export type TimedPhase =
  | "welcome"
  | "previous_action"
  | "keep_improve_try"
  | "grouping_voting"
  | "hall_of_fame"
  | "action_plan";

export type PhaseDurations = Record<TimedPhase, number>;

export type TimerStatus = "idle" | "running" | "paused" | "finished";

export interface TimerState {
  status: TimerStatus;
  durationSeconds: number;
  remainingSeconds: number;
}

// Mini-timer de rotación del Nivel 4. null cuando currentSpeakerId es null.
export interface SpeakerTimerState {
  status: "running" | "paused";
  remainingSeconds: number;
}

export interface Participant {
  id: string;
  name: string;
  role: Role;
  connected: boolean;
  avatarId: string | null;
  // Credencial secreta de reconexión — nunca viaja por la red (ver
  // toPublicRoom en room.ts). Solo existe en la copia del servidor.
  sessionToken: string;
}

export type CardColumn = "keep" | "improve" | "try" | "action_plan";

export interface Card {
  id: string;
  column: CardColumn;
  authorId: string;
  votes: string[];
  text: string;
  assigneeIds?: string[];
}

export interface Room {
  code: string;
  hostId: string;
  phase: Phase;
  phaseHistory: Phase[];
  timer: TimerState;
  participants: Participant[];
  cards: Card[];
  phaseDurations: PhaseDurations;
  starsPerParticipant: number;
  currentSpeakerId: string | null;
  secondsPerSpeaker: number;
  speakerTimer: SpeakerTimerState | null;
  previousActionNotes: string;
  previousActionChecks: Record<number, boolean>;
  teamName: string;
  createdAt: number;
}

// Room tal como sale hacia un socket (room:state/room:created/room:joined):
// mismo shape, pero cada Participant sin sessionToken (ver toPublicRoom).
export type PublicParticipant = Omit<Participant, "sessionToken">;
export interface PublicRoom extends Omit<Room, "participants"> {
  participants: PublicParticipant[];
}
