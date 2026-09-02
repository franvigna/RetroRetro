import type { Room, TimedPhase } from "../domain/types.js";

// Espejo, del lado del cliente, de back/src/socket/events.ts — no se puede
// compartir literalmente el archivo (front/ y back/ son proyectos npm
// independientes, sin workspace común), así que se mantienen sincronizados a
// mano igual que ya se mantenía shared-contract.md con el código real. Si en
// algún momento se arma un workspace compartido, este archivo (y el del
// back) son los primeros candidatos a unificar en un paquete de tipos común.

// ===== Cliente → Servidor =====

export interface RoomCreatePayload {
  hostName: string;
  phaseDurations?: Partial<Record<TimedPhase, number>>;
  starsPerParticipant?: number;
  secondsPerSpeaker?: number;
  avatarId?: string | null;
  previousActionNotes?: string;
  teamName?: string;
}

export interface RoomJoinPayload {
  code: string;
  name?: string;
  avatarId?: string | null;
  sessionToken?: string | null;
}

export interface RoomUpdateSettingsPayload {
  starsPerParticipant: number;
}

export interface PhaseSetPreviousActionItemPayload {
  index: number;
  done: boolean | null;
}

export interface TimerAddTimePayload {
  seconds: number;
}

export interface CardAddPayload {
  column: string;
  text?: string;
  assigneeIds?: string[];
}

export interface CardVotePayload {
  cardId: string;
}

export interface CardEditPayload {
  cardId: string;
  text?: string;
  assigneeIds?: string[];
}

export interface CardDeletePayload {
  cardId: string;
}

export interface TurnSetSpeakerPayload {
  participantId: string;
}

export interface ClientToServerEvents {
  "room:create": (payload: RoomCreatePayload) => void;
  "room:join": (payload: RoomJoinPayload) => void;
  "room:leave": () => void;
  "room:update_settings": (payload: RoomUpdateSettingsPayload) => void;
  "room:close": () => void;
  "phase:start_session": () => void;
  "phase:advance": () => void;
  "phase:go_back": () => void;
  "phase:set_previous_action_item": (payload: PhaseSetPreviousActionItemPayload) => void;
  "timer:pause": () => void;
  "timer:resume": () => void;
  "timer:add_time": (payload: TimerAddTimePayload) => void;
  "card:add": (payload: CardAddPayload) => void;
  "card:vote": (payload: CardVotePayload) => void;
  "card:edit": (payload: CardEditPayload) => void;
  "card:delete": (payload: CardDeletePayload) => void;
  "turn:set_speaker": (payload: TurnSetSpeakerPayload) => void;
  "turn:clear_speaker": () => void;
  "turn:advance": () => void;
}

// ===== Servidor → Cliente =====

export interface ServerToClientEvents {
  "room:created": (payload: { code: string; room: Room; sessionToken: string }) => void;
  "room:joined": (payload: { participantId: string; sessionToken: string }) => void;
  "room:state": (payload: { room: Room }) => void;
  "room:not_found": (payload: { code: string }) => void;
  "room:join_locked": (payload: { code: string }) => void;
  "room:closed": (payload: { code: string }) => void;
  "participant:disconnected": (payload: { participantId: string }) => void;
  "timer:tick": (payload: { remainingSeconds: number }) => void;
  "speaker:tick": (payload: { remainingSeconds: number }) => void;
  "error:unauthorized": (payload: { action: string }) => void;
  "error:invalid_action": (payload: { action: string; reason: string }) => void;
  "error:rate_limited": (payload: { action: string }) => void;
}
