import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRoom } from "../context/RoomContext.jsx";
import { PhaseDurationInput } from "../components/PhaseDurationInput.jsx";
import { StarsSliderInput } from "../components/StarsSliderInput.jsx";
// Avatares deshabilitados temporalmente (feedback: el set de sprites no
// convence todavía) — queda como mejora futura, ver AvatarPicker.jsx.
// import { AvatarPicker } from "../components/AvatarPicker.jsx";
import { formatMinutesAsHours } from "../utils/formatTime.js";
import {
  TIMED_PHASES,
  DEFAULT_DURATIONS_MINUTES,
  TIMEBOXING_NOTES,
  PHASE_THEMES,
  DEFAULT_STARS_PER_PARTICIPANT,
  DEFAULT_SECONDS_PER_SPEAKER,
  MIN_SECONDS_PER_SPEAKER,
  MAX_SECONDS_PER_SPEAKER,
  minutesToSeconds,
} from "../domain/phaseThemes.js";

const STEP_HOST_NAME = 0;
const STEP_DURATIONS = 1;
const STEP_STARS = 2;
const TOTAL_STEPS = 3;

export function CreateRoomPage() {
  const navigate = useNavigate();
  const { createRoom, room } = useRoom();

  const [step, setStep] = useState(STEP_HOST_NAME);
  const [hostName, setHostName] = useState("");
  const [durations, setDurations] = useState(() => ({ ...DEFAULT_DURATIONS_MINUTES }));
  const [starsPerParticipant, setStarsPerParticipant] = useState(DEFAULT_STARS_PER_PARTICIPANT);
  const [secondsPerSpeaker, setSecondsPerSpeaker] = useState(DEFAULT_SECONDS_PER_SPEAKER);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (room?.code) {
      navigate(`/room/${room.code}`);
    }
  }, [room, navigate]);

  const hostNameError = touched && !hostName.trim();

  function handleNext(e) {
    e.preventDefault();
    setTouched(true);
    if (step === STEP_HOST_NAME && !hostName.trim()) return;
    setTouched(false);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function handleBack() {
    setTouched(false);
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const phaseDurations = Object.fromEntries(
      TIMED_PHASES.map((phase) => [phase, minutesToSeconds(durations[phase])])
    );
    createRoom({ hostName: hostName.trim(), phaseDurations, starsPerParticipant, secondsPerSpeaker });
  }

  return (
    <div className="page page-narrow">
      <h1 className="brand-title pixel-text">CREAR SALA</h1>

      <div className="cabinet">
        <div className="cabinet-bezel" />
        <div className="step-indicator">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span key={i} className="step-dot" data-active={String(i === step)} />
          ))}
        </div>

        {step === STEP_HOST_NAME && (
          <form onSubmit={handleNext}>
            <h2 className="cabinet-title">PASO 1</h2>
            <p className="cabinet-subtitle">¿Cómo te llamás?</p>
            <div className="field">
              <label htmlFor="hostName">Tu nombre</label>
              <input
                id="hostName"
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Ej: Cisco"
              />
              {hostNameError && <span className="field-error">Ingresá tu nombre para continuar.</span>}
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              Siguiente ▶
            </button>
          </form>
        )}

        {step === STEP_DURATIONS && (
          <form onSubmit={handleNext}>
            <h2 className="cabinet-title">PASO 2</h2>
            <p className="cabinet-subtitle">Duración de cada nivel</p>
            {TIMED_PHASES.map((phase) => (
              <PhaseDurationInput
                key={phase}
                label={`${PHASE_THEMES[phase].title} — ${PHASE_THEMES[phase].subtitle}`}
                value={durations[phase]}
                onChange={(minutes) => setDurations((d) => ({ ...d, [phase]: minutes }))}
                note={TIMEBOXING_NOTES[phase]}
              />
            ))}
            <PhaseDurationInput
              label={`${PHASE_THEMES.expression_round.title} — ${PHASE_THEMES.expression_round.subtitle}`}
              value={secondsPerSpeaker}
              onChange={setSecondsPerSpeaker}
              note="Recomendado: 60 segundos. Cada persona habla ese tiempo y rota sola — el anfitrión puede saltar a cualquiera en cualquier momento."
              min={MIN_SECONDS_PER_SPEAKER}
              max={MAX_SECONDS_PER_SPEAKER}
              unit="segundos por persona"
            />
            <p className="cabinet-total">
              Duración total aproximada:{" "}
              <strong>
                {formatMinutesAsHours(
                  TIMED_PHASES.reduce((sum, phase) => sum + Number(durations[phase] || 0), 0)
                )}
              </strong>
            </p>
            <div className="btn-row">
              <button type="button" className="btn btn-ghost" onClick={handleBack}>
                ◀ Atrás
              </button>
              <button type="submit" className="btn btn-primary">
                Siguiente ▶
              </button>
            </div>
          </form>
        )}

        {step === STEP_STARS && (
          <form onSubmit={handleSubmit}>
            <h2 className="cabinet-title">PASO 3</h2>
            <p className="cabinet-subtitle">Estrellas de puntaje</p>
            <StarsSliderInput value={starsPerParticipant} onChange={setStarsPerParticipant} />
            <div className="btn-row">
              <button type="button" className="btn btn-ghost" onClick={handleBack}>
                ◀ Atrás
              </button>
              <button type="submit" className="btn btn-primary">
                Crear sala ▶
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
