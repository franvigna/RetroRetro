import { useEffect } from "react";
import { playBeep } from "../utils/beep.js";

interface TimerFinishedBannerProps {
  isHost: boolean;
  onAddTime: (seconds: number) => void;
  onAdvance: () => void;
}

// Aviso al llegar a 0 el timer de una fase normal (no expression_round, que
// usa SpeakerRotationWarning en su lugar — ver ActivePhasePage.jsx). Suena
// una vez al montarse y ofrece +5min/Continuar solo al host; el participante
// ve el mismo aviso sin botones de acción (HU-F16 en front.md).
export function TimerFinishedBanner({ isHost, onAddTime, onAdvance }: TimerFinishedBannerProps) {
  useEffect(() => {
    playBeep();
  }, []);

  return (
    <div className="timer-finished-banner" role="alert">
      <p className="timer-finished-title">¡TIEMPO CUMPLIDO!</p>
      {isHost && (
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={() => onAddTime(300)}>
            +5 min
          </button>
          <button type="button" className="btn btn-host" onClick={onAdvance}>
            Continuar ▶
          </button>
        </div>
      )}
    </div>
  );
}
