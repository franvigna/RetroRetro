import {
  createRoom,
  resolveAvatarId,
  generateSessionToken,
  toPublicRoom,
  isRoomLockedForNewJoins,
  updateRoomSettings,
} from "../../domain/room.js";
import { InvalidActionError, RateLimitedError } from "../../domain/errors.js";
import { assertIsHost } from "../../domain/authorization.js";
import { generateRoomCode } from "../../rooms/codeGenerator.js";
import * as roomStore from "../../rooms/roomStore.js";
import {
  stopTimerLoop,
  stopSpeakerTimerLoop,
  isTimerLoopRunning,
  isSpeakerTimerLoopRunning,
} from "../timerLoop.js";
import { isRateLimited } from "../rateLimiter.js";

// room:join tolera más frecuencia (reconexiones automáticas legítimas tras
// cortes de red), room:create es más restrictivo — crear salas sin límite
// permite agotar la memoria del servidor con salas vacías (ver rateLimiter.js).
const CREATE_LIMIT = { max: 5, windowMs: 60_000 };
const JOIN_LIMIT = { max: 20, windowMs: 10_000 };

export function registerRoomHandlers(
  io,
  socket,
  { broadcastRoomState, emitError, startRoomTimerIfNeeded, startSpeakerTimerIfNeeded }
) {
  socket.on(
    "room:create",
    ({ hostName, phaseDurations, starsPerParticipant, secondsPerSpeaker, avatarId, previousActionNotes } = {}) => {
      try {
        if (isRateLimited(socket.id, "room:create", CREATE_LIMIT)) {
          throw new RateLimitedError("room:create");
        }
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
    if (isRateLimited(socket.id, "room:join", JOIN_LIMIT)) {
      emitError(socket, "room:join", new RateLimitedError("room:join"));
      return;
    }

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

      // Si todos los sockets se habían desconectado, disconnect detuvo los
      // intervalos para no consumir CPU sin audiencia. Al volver el primero,
      // hay que reactivar el loop que el estado todavía declara `running`;
      // de lo contrario el contador queda congelado para siempre.
      if (room.timer.status === "running" && !isTimerLoopRunning(code)) {
        startRoomTimerIfNeeded(code);
      }
      if (room.speakerTimer?.status === "running" && !isSpeakerTimerLoopRunning(code)) {
        startSpeakerTimerIfNeeded(code);
      }
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

  // Panel de configuración del host (ver back.md): a diferencia de las
  // duraciones de fase (fijas desde la creación, para no tener que resolver
  // qué pasa con un timer ya corriendo), starsPerParticipant sí se puede
  // ajustar en cualquier momento de la sesión.
  socket.on("room:update_settings", ({ starsPerParticipant } = {}) => {
    const { code, participantId } = socket.data;
    const room = roomStore.get(code);
    if (!room) return;

    try {
      assertIsHost(room, participantId, "room:update_settings");
      const nextRoom = updateRoomSettings(room, { starsPerParticipant });
      roomStore.set(code, nextRoom);
      broadcastRoomState(code);
    } catch (err) {
      emitError(socket, "room:update_settings", err);
    }
  });

  // Cierre explícito del host (ver back.md, panel de configuración): a
  // diferencia de room:leave (que solo desconecta a quien lo pide), esto
  // termina la sala para TODOS de inmediato, sin esperar los timeouts de
  // limpieza automática (cleanup.js). room:closed llega antes de que el
  // servidor corte la membership del socket.io room, así que todos los
  // clientes conectados en ese momento lo reciben.
  socket.on("room:close", () => {
    const { code, participantId } = socket.data;
    const room = roomStore.get(code);
    if (!room) return;

    try {
      assertIsHost(room, participantId, "room:close");
      io.to(code).emit("room:closed", { code });
      stopTimerLoop(code);
      stopSpeakerTimerLoop(code);
      roomStore.remove(code);
      for (const socketId of io.sockets.adapter.rooms.get(code) ?? []) {
        io.sockets.sockets.get(socketId)?.leave(code);
      }
    } catch (err) {
      emitError(socket, "room:close", err);
    }
  });
}
