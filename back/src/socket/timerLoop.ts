import { tick } from "../domain/timer.js";
import { tickSpeakerTimer } from "../domain/turns.js";

// Map<code, intervalId> — deliberadamente separado del RoomState serializable
// para no ensuciar el contrato con detalles de implementación de Node.
const intervals = new Map<string, ReturnType<typeof setInterval>>();

interface TickResult {
  finished?: boolean;
}

export function startTimerLoop(code: string, onTick: (tickFn: typeof tick) => TickResult | undefined): void {
  stopTimerLoop(code);
  const intervalId = setInterval(() => {
    const result = onTick(tick);
    if (result?.finished) {
      stopTimerLoop(code);
    }
  }, 1000);
  intervals.set(code, intervalId);
}

export function stopTimerLoop(code: string): void {
  const intervalId = intervals.get(code);
  if (intervalId) {
    clearInterval(intervalId);
    intervals.delete(code);
  }
}

export function isTimerLoopRunning(code: string): boolean {
  return intervals.has(code);
}

// Loop paralelo e independiente para el mini-timer de rotación del Nivel 4
// (speakerTimer) — Map propio para no mezclarse con el timer de fase, aunque
// en la práctica nunca corren los dos a la vez para una misma sala (ver
// back.md HU-B07: expression_round no tiene timer de fase).
const speakerIntervals = new Map<string, ReturnType<typeof setInterval>>();

export function startSpeakerTimerLoop(code: string, onTick: (tickFn: typeof tickSpeakerTimer) => TickResult | undefined): void {
  stopSpeakerTimerLoop(code);
  const intervalId = setInterval(() => {
    const result = onTick(tickSpeakerTimer);
    if (result?.finished) {
      stopSpeakerTimerLoop(code);
    }
  }, 1000);
  speakerIntervals.set(code, intervalId);
}

export function stopSpeakerTimerLoop(code: string): void {
  const intervalId = speakerIntervals.get(code);
  if (intervalId) {
    clearInterval(intervalId);
    speakerIntervals.delete(code);
  }
}

export function isSpeakerTimerLoopRunning(code: string): boolean {
  return speakerIntervals.has(code);
}
