import { formatTime } from "../utils/formatTime.js";

// Muestra mm:ss a partir de remainingSeconds. Nunca calcula el tiempo por su
// cuenta: solo formatea lo que llega en room.timer (regla dura de front.md).
export function Timer({ timer }) {
  if (!timer) return null;
  const { remainingSeconds, status } = timer;

  return (
    <div className="timer" role="timer" aria-live="polite">
      <span className="timer-label">
        {status === "paused" ? "PAUSA" : status === "finished" ? "TIEMPO" : "TIEMPO"}
      </span>
      <span className="timer-value" data-status={status}>
        {formatTime(remainingSeconds)}
      </span>
    </div>
  );
}
