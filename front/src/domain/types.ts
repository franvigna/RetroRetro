// Tipos canónicos del estado de sala tal como lo recibe el cliente por
// socket (room:state/room:created/room:joined) — espejo de
// back/src/domain/types.ts (allá es PublicRoom/PublicParticipant, acá es
// directamente Room/Participant porque el front nunca ve otra forma: el
// sessionToken viaja aparte, nunca dentro de Room, ver
// requirements/shared-contract.md sección 4).

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
