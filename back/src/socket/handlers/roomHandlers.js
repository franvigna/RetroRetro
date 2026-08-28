import { createRoom, resolveAvatarId } from "../../domain/room.js";
import { InvalidActionError } from "../../domain/errors.js";
import { generateRoomCode } from "../../rooms/codeGenerator.js";
import * as roomStore from "../../rooms/roomStore.js";
import { stopTimerLoop, stopSpeakerTimerLoop } from "../timerLoop.js";

export function registerRoomHandlers(io, socket, { broadcastRoomState, emitError }) {
  socket.on(
    "room:create",
    ({ hostName, phaseDurations, starsPerParticipant, secondsPerSpeaker, avatarId, previousActionNotes } = {}) => {
      try {
        const code = generateRoomCode((c) => roomStore.has(c));
        const room = createRoom({
          code,
          hostId: socket.id,
          hostName,
          phaseDurations,
          starsPerParticipant,
          secondsPerSpeaker,
          avatarId,
          previousActionNotes,
          now: Date.now(),
        });
        roomStore.set(code, room);
        socket.join(code);
        socket.data.code = code;
        socket.data.participantId = socket.id;
        socket.emit("room:created", { code, room });
      } catch (err) {
        emitError(socket, "room:create", err);
      }
    }
  );

  socket.on("room:join", ({ code, name, avatarId } = {}) => {
    const room = roomStore.get(code);
    if (!room) {
      socket.emit("room:not_found", { code });
      return;
    }

    try {
      const disconnectedMatch = room.participants.find((p) => p.name === name && !p.connected);
      let participantId;

      if (disconnectedMatch) {
        // Reconexión: conserva la identidad y el avatarId originales, no los pisa
        // con lo que venga en este pedido.
        participantId = disconnectedMatch.id;
        room.participants = room.participants.map((p) =>
          p.id === participantId ? { ...p, connected: true } : p
        );
      } else {
        if (!name || !name.trim()) {
          throw new InvalidActionError("room:join", "name no puede estar vacío");
        }
        participantId = socket.id;
        room.participants = [
          ...room.participants,
          {
            id: participantId,
            name: name.trim(),
            role: "participant",
            connected: true,
            avatarId: resolveAvatarId(avatarId),
          },
        ];
      }

      roomStore.set(code, room);
      socket.join(code);
      socket.data.code = code;
      socket.data.participantId = participantId;
      // participantId puede diferir de socket.id en una reconexión (se reutiliza
      // el id histórico del participante desconectado, ver shared-contract.md
      // sección 4) — el cliente no puede asumir que su identidad es socket.id.
      socket.emit("room:joined", { participantId });
      broadcastRoomState(code);
    } catch (err) {
      emitError(socket, "room:join", err);
    }
  });

  socket.on("room:leave", () => {
    const { code, participantId } = socket.data;
    if (!code) return;
    const room = roomStore.get(code);
    if (!room) return;

    room.participants = room.participants.map((p) =>
      p.id === participantId ? { ...p, connected: false } : p
    );
    roomStore.set(code, room);
    socket.leave(code);
    broadcastRoomState(code);

    const stillConnected = room.participants.some((p) => p.connected);
    if (!stillConnected) {
      stopTimerLoop(code);
      stopSpeakerTimerLoop(code);
    }
  });
}
