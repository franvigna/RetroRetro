import { useId, useState } from "react";
import { MIN_PHASE_DURATION_MINUTES, MAX_PHASE_DURATION_MINUTES } from "../domain/phaseThemes.js";

interface PhaseDurationInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  note?: string;
  min?: number;
  max?: number;
  unit?: string;
}

// Input numérico en minutos (o la unidad que se pase) + tooltip con valor
// recomendado y nota de timeboxing (HU-F01b). El tooltip se muestra en hover
// y en focus (teclado). min/max/unit son configurables para poder reusar el
// mismo componente en el input de segundos-por-orador del Nivel 4.
export function PhaseDurationInput({
  label,
  value,
  onChange,
  note,
  min = MIN_PHASE_DURATION_MINUTES,
  max = MAX_PHASE_DURATION_MINUTES,
  unit = "minutos",
}: PhaseDurationInputProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const inputId = useId();
  const tooltipId = useId();

  return (
    <div className="field">
      <label htmlFor={inputId}>
        {label}{" "}
        <span className="tooltip-wrapper">
          <button
            type="button"
            className="tooltip-trigger"
            aria-describedby={tooltipId}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
          >
            ?
          </button>
          {showTooltip && (
            <span role="tooltip" id={tooltipId} className="tooltip-bubble">
              {note}
            </span>
          )}
        </span>
      </label>
      <input id={inputId} type="number" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="field-help">{unit}</span>
    </div>
  );
}
