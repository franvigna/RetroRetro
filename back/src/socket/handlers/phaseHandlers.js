import { startSession, advancePhase, goBackPhase } from "../../domain/phases.js";
import { setPreviousActionItem } from "../../domain/previousAction.js";
import { assertIsHost } from "../../domain/authorization.js";
import { RateLimitedError } from "../../domain/errors.js";
import * as roomStore from "../../rooms/roomStore.js";
import { stopTimerLoop, stopSpeakerTimerLoop } from "../timerLoop.js";
import { isRateLimited } from "../rateLimiter.js";

const SET_ITEM_LIMIT = { max: 40, windowMs: 10_000 };

function applyPhaseTransition(socket, action, transitionFn, { broadcastRoomState, emitError, startRoomTimerIfNeeded }) {
  const { code, participantId } = socket.data;
  const room = roomStore.get(code);
  if (!room) return;

  try {
    assertIsHost(room, participantId, action);
    const nextRoom = transitionFn(room);
    roomStore.set(code, nextRoom);
    stopTimerLoop(code);
    stopSpeakerTimerLoop(code);
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

  // A diferencia del resto de este archivo, no es host-only: cualquiera en la
  // charla grupal del Nivel 2 puede señalar "esto se cumplió" (ver decisión
  // de producto en requirements/back.md). `done` es explícito (dos botones,
  // ✓ y ✕, en vez de un único toggle) — ver domain/previousAction.js.
  socket.on("phase:set_previous_action_item", ({ index, done } = {}) => {
    const { code, participantId } = socket.data;
    const room = roomStore.get(code);
    if (!room) return;

    try {
      if (isRateLimited(socket.id, "phase:set_previous_action_item", SET_ITEM_LIMIT)) {
        throw new RateLimitedError("phase:set_previous_action_item");
      }
      const nextRoom = setPreviousActionItem(room, { index, done });
      roomStore.set(code, nextRoom);
      ctx.broadcastRoomState(code);
    } catch (err) {
      ctx.emitError(socket, "phase:set_previous_action_item", err);
    }
  });
}
