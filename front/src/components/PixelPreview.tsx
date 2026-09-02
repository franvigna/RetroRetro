import { useEffect, useRef, type CSSProperties } from "react";
import type { Raster } from "../domain/pixelArt.js";

interface PixelPreviewProps {
  raster: Raster | null;
  displaySize?: number;
}

// Pinta el raster real (tamaño = GRID_SIZE de pixelArt.ts) en un <canvas> (sin escalar los datos, solo la
// caja CSS) para que lo que se ve sea exactamente lo que se va a exportar.
// El fondo tipo damero de .pixel-preview deja ver la transparencia.
export function PixelPreview({ raster, displaySize = 256 }: PixelPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !raster) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(raster.data), raster.width, raster.height), 0, 0);
  }, [raster]);

  const sizeStyle = { "--preview-size": `${displaySize}px` } as CSSProperties;

  if (!raster) {
    return (
      <div className="pixel-preview pixel-preview-empty" style={sizeStyle}>
        <span className="field-help">Subí una foto para ver el resultado acá</span>
      </div>
    );
  }

  return (
    <div className="pixel-preview" style={sizeStyle}>
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
