import { InvalidActionError } from "./errors.js";

export function tick(timer) {
  if (timer.status !== "running") return timer;
  const remainingSeconds = Math.max(0, timer.remainingSeconds - 1);
  const status = remainingSeconds === 0 ? "finished" : "running";
  return { ...timer, remainingSeconds, status };
}

export function pause(timer) {
  if (timer.status !== "running") {
    throw new InvalidActionError("timer:pause", "el timer no está corriendo");
  }
  return { ...timer, status: "paused" };
}

export function resume(timer) {
  if (timer.status !== "paused") {
    throw new InvalidActionError("timer:resume", "el timer no está pausado");
  }
  return { ...timer, status: "running" };
}

// seconds puede ser negativo para restar tiempo (ej: -300 = -5 min). El
// resultado se clampea a un mínimo de 0, nunca queda negativo (back.md HU-B12).
export function addTime(timer, seconds) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds === 0) {
    throw new InvalidActionError("timer:add_time", "seconds debe ser un número distinto de cero");
  }
  if (timer.status !== "running" && timer.status !== "paused") {
    throw new InvalidActionError("timer:add_time", "el timer no está activo");
  }
  return {
    ...timer,
    durationSeconds: Math.max(0, timer.durationSeconds + seconds),
    remainingSeconds: Math.max(0, timer.remainingSeconds + seconds),
  };
}
