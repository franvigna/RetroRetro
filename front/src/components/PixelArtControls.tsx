import { useId } from "react";
import type { PixelArtOptions } from "../domain/pixelArt.js";

const COLOR_COUNT_MIN = 4;
const COLOR_COUNT_MAX = 32;
const ALPHA_THRESHOLD_MIN = 0.1;
const ALPHA_THRESHOLD_MAX = 0.9;
const PADDING_MIN = 0;
const PADDING_MAX = 0.3;
const SATURATION_MIN = 0.5;
const SATURATION_MAX = 2;
const CONTRAST_MIN = 0.5;
const CONTRAST_MAX = 2;

interface PixelArtControlsProps {
  params: PixelArtOptions;
  onChange: (patch: Partial<PixelArtOptions>) => void;
  disabled?: boolean;
}

// Controles de ajuste del pipeline de pixelArt.ts. Cada cambio dispara
// onChange de inmediato: useAvatarLab ya cachea el raster recortado por
// MediaPipe, así que recalcular acá no vuelve a correr la segmentación por
// IA — el preview se siente instantáneo.
export function PixelArtControls({ params, onChange, disabled = false }: PixelArtControlsProps) {
  const colorCountId = useId();
  const alphaThresholdId = useId();
  const paddingId = useId();
  const saturationId = useId();
  const contrastId = useId();
  const snapId = useId();

  return (
    <div className="pixel-art-controls">
      <div className="field">
        <label htmlFor={colorCountId}>Cantidad de colores: {params.colorCount}</label>
        <input
          id={colorCountId}
          type="range"
          min={COLOR_COUNT_MIN}
          max={COLOR_COUNT_MAX}
          step={1}
          value={params.colorCount}
          disabled={disabled}
          onChange={(e) => onChange({ colorCount: Number(e.target.value) })}
        />
      </div>

      <div className="field">
        <label htmlFor={alphaThresholdId}>Sensibilidad del recorte de fondo</label>
        <input
          id={alphaThresholdId}
          type="range"
          min={ALPHA_THRESHOLD_MIN}
          max={ALPHA_THRESHOLD_MAX}
          step={0.05}
          value={params.alphaThreshold}
          disabled={disabled}
          onChange={(e) => onChange({ alphaThreshold: Number(e.target.value) })}
        />
        <span className="field-help">Más alto = recorta más agresivo alrededor de la persona.</span>
      </div>

      <div className="field">
        <label htmlFor={paddingId}>Margen alrededor del personaje</label>
        <input
          id={paddingId}
          type="range"
          min={PADDING_MIN}
          max={PADDING_MAX}
          step={0.02}
          value={params.paddingRatio}
          disabled={disabled}
          onChange={(e) => onChange({ paddingRatio: Number(e.target.value) })}
        />
      </div>

      <div className="field">
        <label htmlFor={saturationId}>Saturación</label>
        <input
          id={saturationId}
          type="range"
          min={SATURATION_MIN}
          max={SATURATION_MAX}
          step={0.05}
          value={params.saturation}
          disabled={disabled}
          onChange={(e) => onChange({ saturation: Number(e.target.value) })}
        />
      </div>

      <div className="field">
        <label htmlFor={contrastId}>Contraste</label>
        <input
          id={contrastId}
          type="range"
          min={CONTRAST_MIN}
          max={CONTRAST_MAX}
          step={0.05}
          value={params.contrast}
          disabled={disabled}
          onChange={(e) => onChange({ contrast: Number(e.target.value) })}
        />
      </div>

      <div className="field field-checkbox">
        <input
          id={snapId}
          type="checkbox"
          checked={params.snapToArcadePalette}
          disabled={disabled}
          onChange={(e) => onChange({ snapToArcadePalette: e.target.checked })}
        />
        <label htmlFor={snapId}>Acercar colores a la paleta arcade</label>
      </div>
    </div>
  );
}
