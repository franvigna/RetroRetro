import { Server } from "socket.io";
import { UnauthorizedError, InvalidActionError, RateLimitedError } from "../domain/errors.js";
import { advanceSpeaker } from "../domain/turns.js";
import { toPublicRoom } from "../domain/room.js";
import * as roomStore from "../rooms/roomStore.js";
import { registerRoomHandlers } from "./handlers/roomHandlers.js";
import { registerPhaseHandlers } from "./handlers/phaseHandlers.js";
import { registerTimerHandlers } from "./handlers/timerHandlers.js";
import { registerCardHandlers } from "./handlers/cardHandlers.js";
import { registerTurnHandlers } from "./handlers/turnHandlers.js";
import { startTimerLoop, stopTimerLoop, startSpeakerTimerLoop, stopSpeakerTimerLoop } from "./timerLoop.js";
import { clearRateLimits } from "./rateLimiter.js";

const RECONNECT_GRACE_MS = 15 * 60 * 1000;

// Tope duro de conexiones simultáneas para todo el servidor (no por sala) —
// protege el plan gratuito de Render (CPU/memoria limitadas) de un pico de
// tráfico o de alguien abriendo muchas pestañas/salas a la vez. No es
// autenticación ni protección contra abuso dirigido, es un techo básico de
// capacidad (ver back.md HU-B11).
export const DEFAULT_MAX_CONCURRENT_CONNECTIONS = 50;

export function setupSocket(httpServer, corsOrigin, { maxConnections = DEFAULT_MAX_CONCURRENT_CONNECTIONS } = {}) {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin },
  });

  io.use((socket, next) => {
    if (io.sockets.sockets.size >= maxConnections) {
      next(new Error("server_full"));
      return;
    }
    next();
  });

  // Durante keep_improve_try (Nivel 3), cada participante ve solo sus propias
  // tarjetas hasta que el host avanza de fase (ver shared-contract.md sección
  // 1, "Visibilidad de tarjetas durante keep_improve_try") — el broadcast
  // deja de ser un único payload idéntico para toda la sala en ese momento.
  const KEEP_IMPROVE_TRY_COLUMNS = ["keep", "improve", "try"];

  function roomStateFor(room, participantId) {
    const visibleCards = room.cards.filter(
      (c) => !KEEP_IMPROVE_TRY_COLUMNS.includes(c.column) || c.authorId === participantId
    );
    return toPublicRoom({ ...room, cards: visibleCards });
  }

  function broadcastRoomState(code) {
    const room = roomStore.get(code);
    if (!room) return;
    roomStore.touch(code);

    if (room.phase !== "keep_improve_try") {
      io.to(code).emit("room:state", { room: toPublicRoom(room) });
      return;
    }

    for (const socketId of io.sockets.adapter.rooms.get(code) ?? []) {
      const clientSocket = io.sockets.sockets.get(socketId);
      if (!clientSocket) continue;
      clientSocket.emit("room:state", { room: roomStateFor(room, clientSocket.data.participantId) });
    }
  }

  function emitError(socket, action, err) {
    if (err instanceof UnauthorizedError) {
      socket.emit("error:unauthorized", { action });
    } else if (err instanceof InvalidActionError) {
      socket.emit("error:invalid_action", { action, reason: err.reason });
    } else if (err instanceof RateLimitedError) {
      socket.emit("error:rate_limited", { action });
    } else {
      throw err;
    }
  }

  function startRoomTimerIfNeeded(code) {
    startTimerLoop(code, (tickFn) => {
      const room = roomStore.get(code);
      if (!room) return { finished: true };

      const nextTimer = tickFn(room.timer);
      const nextRoom = { ...room, timer: nextTimer };
      roomStore.set(code, nextRoom);

      if (nextTimer.status === "finished") {
        // El cambio de status (running -> finished) tiene que llegar en un
        // room:state completo, no alcanza con timer:tick (que solo manda
        // remainingSeconds) — si no, el cliente nunca se entera de que hay
        // que mostrar la alarma de fin de timer (ver front.md HU-F16).
        broadcastRoomState(code);
      } else {
        io.to(code).emit("timer:tick", { remainingSeconds: nextTimer.remainingSeconds });
      }

      return { finished: nextTimer.status !== "running" };
    });
  }

  // Mini-timer de rotación del Nivel 4 (speakerTimer, ver back.md HU-B07). Al
  // llegar a 0, rota automáticamente al siguiente orador (mismo mecanismo que
  // turn:advance) en vez de solo detener el loop — así la ronda de expresión
  // avanza sola sin que el host tenga que estar cronometrando a cada persona.
  function startSpeakerTimerIfNeeded(code) {
    startSpeakerTimerLoop(code, (tickFn) => {
      const room = roomStore.get(code);
      if (!room || !room.speakerTimer) return { finished: true };

      const nextSpeakerTimer = tickFn(room.speakerTimer);

      if (nextSpeakerTimer.status === "running" && nextSpeakerTimer.remainingSeconds === 0) {
        const rotatedRoom = advanceSpeaker({ ...room, speakerTimer: nextSpeakerTimer });
        roomStore.set(code, rotatedRoom);
        broadcastRoomState(code);
        // El nuevo speakerTimer arranca en secondsPerSpeaker, no en 0 — seguimos corriendo.
        return { finished: false };
      }

      const nextRoom = { ...room, speakerTimer: nextSpeakerTimer };
      roomStore.set(code, nextRoom);
      io.to(code).emit("speaker:tick", { remainingSeconds: nextSpeakerTimer.remainingSeconds });

      return { finished: nextSpeakerTimer.status !== "running" };
    });
  }

  const ctx = { broadcastRoomState, emitError, startRoomTimerIfNeeded, startSpeakerTimerIfNeeded };

  io.on("connection", (socket) => {
    registerRoomHandlers(io, socket, ctx);
    registerPhaseHandlers(io, socket, ctx);
    registerTimerHandlers(io, socket, ctx);
    registerCardHandlers(io, socket, ctx);
    registerTurnHandlers(io, socket, ctx);

    socket.on("disconnect", () => {
      clearRateLimits(socket.id);
      const { code, participantId } = socket.data;
      if (!code) return;
      const room = roomStore.get(code);
      if (!room) return;

      room.participants = room.participants.map((p) =>
        p.id === participantId ? { ...p, connected: false } : p
      );
      roomStore.set(code, room);
      io.to(code).emit("participant:disconnected", { participantId });
      broadcastRoomState(code);

      const stillConnected = room.participants.some((p) => p.connected);
      if (!stillConnected) {
        stopTimerLoop(code);
        stopSpeakerTimerLoop(code);
      }

      setTimeout(() => {
        const currentRoom = roomStore.get(code);
        if (!currentRoom) return;
        const participant = currentRoom.participants.find((p) => p.id === participantId);
        if (participant && !participant.connected) {
          currentRoom.participants = currentRoom.participants.filter((p) => p.id !== participantId);
          roomStore.set(code, currentRoom);
          broadcastRoomState(code);
        }
      }, RECONNECT_GRACE_MS);
    });
  });

  return io;
}
