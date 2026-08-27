import { randomUUID } from "node:crypto";
import { addCard, toggleVote, editCard, deleteCard } from "../../domain/cards.js";
import * as roomStore from "../../rooms/roomStore.js";

export function registerCardHandlers(io, socket, { broadcastRoomState, emitError }) {
  socket.on("card:add", ({ column, text, title, description, assigneeIds } = {}) => {
    const { code, participantId } = socket.data;
    const room = roomStore.get(code);
    if (!room) return;

    try {
      const nextRoom = addCard(room, {
        column,
        text,
        title,
        description,
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
    const room = roomStore.get(code);
    if (!room) return;

    try {
      const nextRoom = toggleVote(room, { cardId, participantId });
      roomStore.set(code, nextRoom);
      broadcastRoomState(code);
    } catch (err) {
      emitError(socket, "card:vote", err);
    }
  });

  socket.on("card:edit", ({ cardId, text, title, description, assigneeIds } = {}) => {
    const { code, participantId } = socket.data;
    const room = roomStore.get(code);
    if (!room) return;

    try {
      const nextRoom = editCard(room, { cardId, text, title, description, assigneeIds, participantId });
      roomStore.set(code, nextRoom);
      broadcastRoomState(code);
    } catch (err) {
      emitError(socket, "card:edit", err);
    }
  });

  socket.on("card:delete", ({ cardId } = {}) => {
    const { code, participantId } = socket.data;
    const room = roomStore.get(code);
    if (!room) return;

    try {
      const nextRoom = deleteCard(room, { cardId, participantId });
      roomStore.set(code, nextRoom);
      broadcastRoomState(code);
    } catch (err) {
      emitError(socket, "card:delete", err);
    }
  });
}
