import { setSpeaker, clearSpeaker, advanceSpeaker } from "../../domain/turns.js";
import { assertIsHost } from "../../domain/authorization.js";
import { InvalidActionError } from "../../domain/errors.js";
import * as roomStore from "../../rooms/roomStore.js";
import { stopSpeakerTimerLoop } from "../timerLoop.js";

export function registerTurnHandlers(io, socket, { broadcastRoomState, emitError, startSpeakerTimerIfNeeded }) {
  socket.on("turn:set_speaker", ({ participantId: speakerId } = {}) => {
    const { code, participantId } = socket.data;
    const room = roomStore.get(code);
    if (!room) return;

    try {
      assertIsHost(room, participantId, "turn:set_speaker");
      if (room.phase !== "expression_round") {
        throw new InvalidActionError("turn:set_speaker", "solo se puede marcar un orador durante expression_round");
      }
      const nextRoom = setSpeaker(room, { participantId: speakerId });
      roomStore.set(code, nextRoom);
      startSpeakerTimerIfNeeded(code);
      broadcastRoomState(code);
    } catch (err) {
      emitError(socket, "turn:set_speaker", err);
    }
  });

  socket.on("turn:clear_speaker", () => {
    const { code, participantId } = socket.data;
    const room = roomStore.get(code);
    if (!room) return;

    try {
      assertIsHost(room, participantId, "turn:clear_speaker");
      if (room.phase !== "expression_round") {
        throw new InvalidActionError("turn:clear_speaker", "solo se puede limpiar el orador durante expression_round");
      }
      const nextRoom = clearSpeaker(room);
      roomStore.set(code, nextRoom);
      stopSpeakerTimerLoop(code);
      broadcastRoomState(code);
    } catch (err) {
      emitError(socket, "turn:clear_speaker", err);
    }
  });

  socket.on("turn:advance", () => {
    const { code, participantId } = socket.data;
    const room = roomStore.get(code);
    if (!room) return;

    try {
      assertIsHost(room, participantId, "turn:advance");
      if (room.phase !== "expression_round") {
        throw new InvalidActionError("turn:advance", "solo se puede avanzar el orador durante expression_round");
      }
      const nextRoom = advanceSpeaker(room);
      roomStore.set(code, nextRoom);
      startSpeakerTimerIfNeeded(code);
      broadcastRoomState(code);
    } catch (err) {
      emitError(socket, "turn:advance", err);
    }
  });
}
