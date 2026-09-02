import { useState } from "react";
import { ImageDropZone } from "../components/ImageDropZone.tsx";
import { PixelPreview } from "../components/PixelPreview.tsx";
import { PixelArtControls } from "../components/PixelArtControls.tsx";
import { AvatarExportPanel } from "../components/AvatarExportPanel.tsx";
import { useAvatarLab, AVATAR_LAB_STATUS } from "../hooks/useAvatarLab.js";
import { isSupported } from "../domain/backgroundRemoval.js";
import { GRID_SIZE } from "../domain/pixelArt.js";
import "../styles/avatarLab.css";

const STATUS_LABELS: Partial<Record<string, string>> = {
  [AVATAR_LAB_STATUS.LOADING_MODEL]: "Cargando el modelo de segmentación…",
  [AVATAR_LAB_STATUS.SEGMENTING]: "Recortando el fondo…",
};

// Herramienta interna (ruta /dev/avatar-lab, ver App.tsx) para generar
// avatares pixel-art (GRID_SIZE x GRID_SIZE, ver pixelArt.ts) a partir de
// una foto, sin depender de ningún servicio de pago: todo el pipeline
// corre en el navegador (ver useAvatarLab.ts). No
// escribe en avatars.ts — el resultado se descarga y se pega a mano, igual
// que se sumaron los 48 avatares actuales.
export function AvatarLabPage() {
  const { status, params, result, error, run, updateParams } = useAvatarLab();
  const [dropError, setDropError] = useState<string | null>(null);

  const isProcessing = status === AVATAR_LAB_STATUS.LOADING_MODEL || status === AVATAR_LAB_STATUS.SEGMENTING;
  const controlsDisabled = status === AVATAR_LAB_STATUS.IDLE || isProcessing;
  const statusMessage = STATUS_LABELS[status];

  function handleImageReady({ bitmap }: { file: File; bitmap: ImageBitmap }) {
    setDropError(null);
    run(bitmap);
  }

  if (!isSupported()) {
    return (
      <div className="page page-narrow">
        <h1 className="brand-title pixel-text">AVATAR LAB</h1>
        <div className="cabinet">
          <p className="field-error">
            Este navegador no soporta las APIs necesarias (WebAssembly / OffscreenCanvas). Probá con una versión
            reciente de Chrome, Edge o Firefox.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-wide">
      <h1 className="brand-title pixel-text">AVATAR LAB</h1>
      <p className="cabinet-subtitle">
        Herramienta interna: subí una foto, se procesa entera en tu navegador (nada se sube a ningún servidor) y
        te da un PNG de {GRID_SIZE}x{GRID_SIZE} para sumar a mano al set de avatares.
      </p>

      <div className="cabinet avatar-lab-grid">
        <div className="avatar-lab-column">
          <ImageDropZone onImageReady={handleImageReady} onError={setDropError} />
          {dropError && <span className="field-error">{dropError}</span>}
          {statusMessage && (
            <span className="field-help" role="status">
              {statusMessage}
            </span>
          )}
          {error && <span className="field-error">{error}</span>}
          <PixelArtControls params={params} onChange={updateParams} disabled={controlsDisabled} />
        </div>

        <div className="avatar-lab-column">
          <PixelPreview raster={result?.raster ?? null} />
          <AvatarExportPanel raster={result?.raster ?? null} disabled={isProcessing} />
        </div>
      </div>
    </div>
  );
}
