import { useEffect, useRef } from "react";

// Pinta el raster real (tamaño = GRID_SIZE de pixelArt.js) en un <canvas> (sin escalar los datos, solo la
// caja CSS) para que lo que se ve sea exactamente lo que se va a exportar.
// El fondo tipo damero de .pixel-preview deja ver la transparencia.
export function PixelPreview({ raster, displaySize = 256 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !raster) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(raster.data), raster.width, raster.height), 0, 0);
  }, [raster]);

  if (!raster) {
    return (
      <div className="pixel-preview pixel-preview-empty" style={{ "--preview-size": `${displaySize}px` }}>
        <span className="field-help">Subí una foto para ver el resultado acá</span>
      </div>
    );
  }

  return (
    <div className="pixel-preview" style={{ "--preview-size": `${displaySize}px` }}>
      <canvas
        ref={canvasRef}
        width={raster.width}
        height={raster.height}
        className="pixel-preview-canvas"
        role="img"
        aria-label="Vista previa del personaje pixel art"
      />
    </div>
  );
}
