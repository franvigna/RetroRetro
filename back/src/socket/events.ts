import type { Server, Socket } from "socket.io";
import type { PublicRoom, CardColumn, TimedPhase } from "../domain/types.js";

// Estado que Socket.io asocia a cada conexión (`socket.data`). `code` y
// `participantId` se completan recién cuando el socket se une a una sala
// (room:create/room:join) — antes de eso están ausentes.
export interface SocketData {
  code?: string;
  participantId?: string;
}

// ===== Cliente → Servidor =====
// Espejo de la tabla de eventos en requirements/shared-contract.md sección 3.
// Todos los campos quedan opcionales acá a propósito: es lo que efectivamente
// puede llegar por la red desde un cliente (nunca confiar en el payload) — la
// validación real ocurre en domain/, no en este mapa de tipos.

export interface RoomCreatePayload {
  hostName?: string;
  phaseDurations?: Partial<Record<TimedPhase, unknown>>;
  starsPerParticipant?: unknown;
  secondsPerSpeaker?: unknown;
  avatarId?: unknown;
  previousActionNotes?: unknown;
  teamName?: unknown;
}

export interface RoomJoinPayload {
  code?: string;
  name?: string;
  avatarId?: unknown;
  sessionToken?: string;
}

export interface RoomUpdateSettingsPayload {
  starsPerParticipant?: unknown;
}

export interface PhaseSetPreviousActionItemPayload {
  index?: unknown;
  done?: unknown;
}

export interface TimerAddTimePayload {
  seconds?: unknown;
}

export interface CardAddPayload {
  column?: unknown;
  text?: string;
  assigneeIds?: string[];
}

export interface CardVotePayload {
  cardId?: string;
}

export interface CardEditPayload {
  cardId?: string;
  text?: string;
  assigneeIds?: string[];
}

export interface CardDeletePayload {
  cardId?: string;
}

export interface TurnSetSpeakerPayload {
  participantId?: unknown;
}

export interface ClientToServerEvents {
  "room:create": (payload?: RoomCreatePayload) => void;
  "room:join": (payload?: RoomJoinPayload) => void;
  "room:leave": () => void;
  "room:update_settings": (payload?: RoomUpdateSettingsPayload) => void;
  "room:close": () => void;
  "phase:start_session": () => void;
  "phase:advance": () => void;
  "phase:go_back": () => void;
  "phase:set_previous_action_item": (payload?: PhaseSetPreviousActionItemPayload) => void;
  "timer:pause": () => void;
  "timer:resume": () => void;
  "timer:add_time": (payload?: TimerAddTimePayload) => void;
  "card:add": (payload?: CardAddPayload) => void;
  "card:vote": (payload?: CardVotePayload) => void;
  "card:edit": (payload?: CardEditPayload) => void;
  "card:delete": (payload?: CardDeletePayload) => void;
  "turn:set_speaker": (payload?: TurnSetSpeakerPayload) => void;
  "turn:clear_speaker": () => void;
  "turn:advance": () => void;
}

// ===== Servidor → Cliente =====

export interface ServerToClientEvents {
  "room:created": (payload: { code: string; room: PublicRoom; sessionToken: string }) => void;
  "room:joined": (payload: { participantId: string; sessionToken: string }) => void;
  "room:state": (payload: { room: PublicRoom }) => void;
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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- no usamos eventos servidor-a-servidor
type InterServerEvents = Record<string, never>;

export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// Dependencias que socket/index.ts inyecta en cada registerXHandlers — ver
// setupSocket. Compartido por los 5 archivos de socket/handlers/.
export interface HandlerContext {
  broadcastRoomState: (code: string) => void;
  emitError: (socket: TypedSocket, action: string, err: unknown) => void;
  startRoomTimerIfNeeded: (code: string) => void;
  startSpeakerTimerIfNeeded: (code: string) => void;
}

// Referencia de CardColumn acá para que quede claro que "columna válida" se
// resuelve en domain/cards.ts, no en este archivo (ver CardAddPayload arriba,
// deliberadamente sin tipar column como CardColumn todavía sin validar).
export type { CardColumn };
