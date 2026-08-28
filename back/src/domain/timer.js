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
// Un timer "finished" también acepta sumar tiempo (es el caso de uso del
// botón "+5 min" del aviso de alarma, HU-B04) y vuelve a "running" si el
// resultado queda por encima de 0.
export function addTime(timer, seconds) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds === 0) {
    throw new InvalidActionError("timer:add_time", "seconds debe ser un número distinto de cero");
  }
  if (timer.status !== "running" && timer.status !== "paused" && timer.status !== "finished") {
    throw new InvalidActionError("timer:add_time", "el timer no está activo");
  }
  const remainingSeconds = Math.max(0, timer.remainingSeconds + seconds);
  const status = timer.status === "finished" && remainingSeconds > 0 ? "running" : timer.status;
  return {
    ...timer,
    durationSeconds: Math.max(0, timer.durationSeconds + seconds),
    remainingSeconds,
    status,
  };
}
