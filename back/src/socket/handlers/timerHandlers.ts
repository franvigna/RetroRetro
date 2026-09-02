import { pause, resume, addTime } from "../../domain/timer.js";
import { assertIsHost } from "../../domain/authorization.js";
import * as roomStore from "../../rooms/roomStore.js";
import { stopTimerLoop, stopSpeakerTimerLoop } from "../timerLoop.js";
import type { TypedServer, TypedSocket, HandlerContext } from "../events.js";
import type { PausableTimer } from "../../domain/timer.js";
import type { TimerState, SpeakerTimerState } from "../../domain/types.js";

// Durante expression_round, Pausar/Reanudar actúan sobre speakerTimer (el
// mini-timer de rotación del Nivel 4) en vez de room.timer, que no aplica a
// esa fase (ver back.md HU-B07). timer:add_time no tiene campo relevante para
// tocar en esa fase, así que no hace nada (el frontend ya oculta esos
// controles ahí, esto es solo la defensa del lado del servidor).
function applyTimerChange(
  socket: TypedSocket,
  action: string,
  transitionFn: (timer: PausableTimer) => PausableTimer,
  { broadcastRoomState, emitError, startRoomTimerIfNeeded, startSpeakerTimerIfNeeded }: HandlerContext
): void {
  const { code, participantId } = socket.data;
  if (!code || !participantId) return;
  const room = roomStore.get(code);
  if (!room) return;

  try {
    assertIsHost(room, participantId, action);

    if (room.phase === "expression_round") {
      if (action === "timer:add_time") return;
      if (!room.speakerTimer) return;

      const nextSpeakerTimer = transitionFn(room.speakerTimer) as SpeakerTimerState;
      const nextRoom = { ...room, speakerTimer: nextSpeakerTimer };
      roomStore.set(code, nextRoom);

      if (nextSpeakerTimer.status === "running") {
        startSpeakerTimerIfNeeded(code);
      } else {
        stopSpeakerTimerLoop(code);
      }
      broadcastRoomState(code);
      return;
    }

    const nextTimer = transitionFn(room.timer) as TimerState;
    const nextRoom = { ...room, timer: nextTimer };
    roomStore.set(code, nextRoom);

    if (nextTimer.status === "running") {
      startRoomTimerIfNeeded(code);
    } else {
      stopTimerLoop(code);
    }
    broadcastRoomState(code);
  } catch (err) {
    emitError(socket, action, err);
  }
}

export function registerTimerHandlers(io: TypedServer, socket: TypedSocket, ctx: HandlerContext): void {
  socket.on("timer:pause", () => {
    applyTimerChange(socket, "timer:pause", pause, ctx);
  });

  socket.on("timer:resume", () => {
    applyTimerChange(socket, "timer:resume", resume, ctx);
  });

  socket.on("timer:add_time", ({ seconds } = {}) => {
    applyTimerChange(socket, "timer:add_time", (timer) => addTime(timer as TimerState, seconds), ctx);
  });
}
