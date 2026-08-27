import { useId } from "react";
import { MIN_STARS_PER_PARTICIPANT, MAX_STARS_PER_PARTICIPANT } from "../domain/phaseThemes.js";

// Slider horizontal para elegir starsPerParticipant (HU-F01c): rango 1-10,
// muestra el valor numérico elegido al lado mientras se arrastra.
export function StarsSliderInput({ value, onChange }) {
  const inputId = useId();

  return (
    <div className="field">
      <label htmlFor={inputId}>Estrellas de puntaje por participante</label>
      <div className="stars-slider-row">
        <input
          id={inputId}
          type="range"
          min={MIN_STARS_PER_PARTICIPANT}
          max={MAX_STARS_PER_PARTICIPANT}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="stars-slider"
        />
        <span className="stars-slider-value" aria-live="polite">
          {value}
        </span>
      </div>
      <span className="field-help">
        Cada participante va a poder repartir {value} {value === 1 ? "estrella" : "estrellas"} en el Nivel 4.
      </span>
    </div>
  );
}
