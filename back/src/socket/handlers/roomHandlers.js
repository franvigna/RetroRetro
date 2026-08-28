import { createRoom, resolveAvatarId, generateSessionToken, toPublicRoom, isRoomLockedForNewJoins } from "../../domain/room.js";
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
        // sessionToken viaja acá, en privado, aparte de `room` (que ya pasó por
        // toPublicRoom y nunca lo incluye) — es la credencial de reconexión de
        // este participante, ver domain/room.js.
        socket.emit("room:created", { code, room: toPublicRoom(room), sessionToken: room.participants[0].sessionToken });
      } catch (err) {
        emitError(socket, "room:create", err);
      }
    }
  );

  socket.on("room:join", ({ code, name, avatarId, sessionToken } = {}) => {
    const room = roomStore.get(code);
    if (!room) {
      socket.emit("room:not_found", { code });
      return;
    }

    try {
      // La reconexión se autentica por sessionToken, nunca por nombre — así
      // nadie puede volver a entrar como otro participante (ni como el host)
      // con solo escribir su nombre mientras está desconectado.
      const tokenMatch = sessionToken ? room.participants.find((p) => p.sessionToken === sessionToken) : null;

      let participantId;
      let issuedToken;

      if (tokenMatch) {
        participantId = tokenMatch.id;
        issuedToken = tokenMatch.sessionToken;
        room.participants = room.participants.map((p) =>
          p.id === participantId ? { ...p, connected: true } : p
        );
      } else {
        // Sin un token válido esto es, por definición, alguien nuevo — nunca
        // se reutiliza la identidad de otro participante por más que el
        // nombre coincida (ver HU-B02b en back.md).
        if (isRoomLockedForNewJoins(room)) {
          socket.emit("room:join_locked", { code });
          return;
        }
        if (!name || !name.trim()) {
          throw new InvalidActionError("room:join", "name no puede estar vacío");
        }
        participantId = socket.id;
        issuedToken = generateSessionToken();
        room.participants = [
          ...room.participants,
          {
            id: participantId,
            name: name.trim(),
            role: "participant",
            connected: true,
            avatarId: resolveAvatarId(avatarId),
            sessionToken: issuedToken,
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
      socket.emit("room:joined", { participantId, sessionToken: issuedToken });
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
