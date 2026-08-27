import { tick } from "../domain/timer.js";
import { tickSpeakerTimer } from "../domain/turns.js";

// Map<code, intervalId> — deliberadamente separado del RoomState serializable
// para no ensuciar el contrato con detalles de implementación de Node.
const intervals = new Map();

export function startTimerLoop(code, onTick) {
  stopTimerLoop(code);
  const intervalId = setInterval(() => {
    const result = onTick(tick);
    if (result?.finished) {
      stopTimerLoop(code);
    }
  }, 1000);
  intervals.set(code, intervalId);
}

export function stopTimerLoop(code) {
  const intervalId = intervals.get(code);
  if (intervalId) {
    clearInterval(intervalId);
    intervals.delete(code);
  }
}

export function isTimerLoopRunning(code) {
  return intervals.has(code);
}

// Loop paralelo e independiente para el mini-timer de rotación del Nivel 4
// (speakerTimer) — Map propio para no mezclarse con el timer de fase, aunque
// en la práctica nunca corren los dos a la vez para una misma sala (ver
// back.md HU-B07: expression_round no tiene timer de fase).
const speakerIntervals = new Map();

export function startSpeakerTimerLoop(code, onTick) {
  stopSpeakerTimerLoop(code);
  const intervalId = setInterval(() => {
    const result = onTick(tickSpeakerTimer);
    if (result?.finished) {
      stopSpeakerTimerLoop(code);
    }
  }, 1000);
  speakerIntervals.set(code, intervalId);
}

export function stopSpeakerTimerLoop(code) {
  const intervalId = speakerIntervals.get(code);
  if (intervalId) {
    clearInterval(intervalId);
    speakerIntervals.delete(code);
  }
}

export function isSpeakerTimerLoopRunning(code) {
  return speakerIntervals.has(code);
}
