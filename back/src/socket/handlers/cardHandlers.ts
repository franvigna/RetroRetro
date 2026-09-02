import { randomUUID } from "node:crypto";
import { addCard, toggleVote, editCard, deleteCard } from "../../domain/cards.js";
import { RateLimitedError } from "../../domain/errors.js";
import * as roomStore from "../../rooms/roomStore.js";
import { isRateLimited } from "../rateLimiter.js";
import type { TypedServer, TypedSocket, HandlerContext } from "../events.js";

// Tope generoso para uso legítimo (nadie escribe/vota decenas de tarjetas
// por segundo a mano) pero suficiente para frenar un cliente que inunda la
// sala — ver rateLimiter.js.
const WRITE_LIMIT = { max: 20, windowMs: 10_000 };
// card:vote es un toggle pensado para tocar varias tarjetas seguidas
// (repartir estrellas), así que tolera más frecuencia que agregar/editar texto.
const VOTE_LIMIT = { max: 40, windowMs: 10_000 };

export function registerCardHandlers(io: TypedServer, socket: TypedSocket, { broadcastRoomState, emitError }: HandlerContext): void {
  socket.on("card:add", ({ column, text, assigneeIds } = {}) => {
    const { code, participantId } = socket.data;
    if (!code || !participantId) return;
    const room = roomStore.get(code);
    if (!room) return;

    try {
      if (isRateLimited(socket.id, "card:add", WRITE_LIMIT)) {
        throw new RateLimitedError("card:add");
      }
      const nextRoom = addCard(room, {
        column,
        text,
        assigneeIds,
        authorId: participantId,
        cardId: randomUUID(),
      });
      roomStore.set(code, nextRoom);
      broadcastRoomState(code);
    } catch (err) {
      emitError(socket, "card:add", err);
    }
  });

  socket.on("card:vote", ({ cardId } = {}) => {
    const { code, participantId } = socket.data;
    if (!code || !participantId) return;
    const room = roomStore.get(code);
    if (!room) return;

    try {
      if (isRateLimited(socket.id, "card:vote", VOTE_LIMIT)) {
        throw new RateLimitedError("card:vote");
      }
      const nextRoom = toggleVote(room, { cardId, participantId });
      roomStore.set(code, nextRoom);
      broadcastRoomState(code);
    } catch (err) {
      emitError(socket, "card:vote", err);
    }
  });

  socket.on("card:edit", ({ cardId, text, assigneeIds } = {}) => {
    const { code, participantId } = socket.data;
    if (!code || !participantId) return;
    const room = roomStore.get(code);
    if (!room) return;

    try {
      if (isRateLimited(socket.id, "card:edit", WRITE_LIMIT)) {
        throw new RateLimitedError("card:edit");
      }
      const nextRoom = editCard(room, { cardId, text, assigneeIds, participantId });
      roomStore.set(code, nextRoom);
      broadcastRoomState(code);
    } catch (err) {
      emitError(socket, "card:edit", err);
    }
  });

  socket.on("card:delete", ({ cardId } = {}) => {
    const { code, participantId } = socket.data;
    if (!code || !participantId) return;
    const room = roomStore.get(code);
    if (!room) return;

    try {
      if (isRateLimited(socket.id, "card:delete", WRITE_LIMIT)) {
        throw new RateLimitedError("card:delete");
      }
      const nextRoom = deleteCard(room, { cardId, participantId });
      roomStore.set(code, nextRoom);
      broadcastRoomState(code);
    } catch (err) {
      emitError(socket, "card:delete", err);
    }
  });
}
