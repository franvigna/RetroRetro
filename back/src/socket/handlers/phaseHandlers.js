import { startSession, advancePhase, goBackPhase } from "../../domain/phases.js";
import { assertIsHost } from "../../domain/authorization.js";
import * as roomStore from "../../rooms/roomStore.js";
import { stopTimerLoop } from "../timerLoop.js";

function applyPhaseTransition(socket, action, transitionFn, { broadcastRoomState, emitError, startRoomTimerIfNeeded }) {
  const { code, participantId } = socket.data;
  const room = roomStore.get(code);
  if (!room) return;

  try {
    assertIsHost(room, participantId, action);
    const nextRoom = transitionFn(room);
    roomStore.set(code, nextRoom);
    stopTimerLoop(code);
    if (nextRoom.timer.status === "running") {
      startRoomTimerIfNeeded(code);
    }
    broadcastRoomState(code);
  } catch (err) {
    emitError(socket, action, err);
  }
}

export function registerPhaseHandlers(io, socket, ctx) {
  socket.on("phase:start_session", () => {
    applyPhaseTransition(socket, "phase:start_session", startSession, ctx);
  });

  socket.on("phase:advance", () => {
    applyPhaseTransition(socket, "phase:advance", advancePhase, ctx);
  });

  socket.on("phase:go_back", () => {
    applyPhaseTransition(socket, "phase:go_back", goBackPhase, ctx);
  });
}
