import { useCallback, useRef, useState } from "react";
import { loadSegmenter, cutoutForeground } from "../domain/backgroundRemoval.js";
import { pixelate, DEFAULT_OPTIONS } from "../domain/pixelArt.js";
import { ARCADE_ACCENT_RGB } from "../domain/arcadePalette.js";

export const AVATAR_LAB_STATUS = {
  IDLE: "idle",
  LOADING_MODEL: "loading-model",
  SEGMENTING: "segmenting",
  READY: "ready",
  ERROR: "error",
};

// Orquesta el pipeline de Avatar Lab. La segmentación por IA (lenta, ~cientos
// de ms) se corre una sola vez por foto y su resultado se guarda en un ref;
// tocar los sliders de colorCount/alphaThreshold/etc. después solo vuelve a
// correr el pipeline puro de pixelArt.js (~5ms) sobre ese raster ya
// recortado, en vez de repetir la segmentación en cada cambio.
export function useAvatarLab() {
  const [status, setStatus] = useState(AVATAR_LAB_STATUS.IDLE);
  const [params, setParams] = useState(DEFAULT_OPTIONS);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const cutoutRasterRef = useRef(null);

  const runPixelate = useCallback((raster, currentParams) => {
    const options = currentParams.snapToArcadePalette
      ? { ...currentParams, themeRgb: ARCADE_ACCENT_RGB }
      : currentParams;
    const pixelated = pixelate(raster, options);

    if (!pixelated) {
      setResult(null);
      setError("No se encontró ningún personaje en la foto. Probá con otra imagen o bajá el umbral.");
      setStatus(AVATAR_LAB_STATUS.ERROR);
      return;
    }

    setResult(pixelated);
    setStatus(AVATAR_LAB_STATUS.READY);
  }, []);

  const run = useCallback(
    async (bitmap) => {
      setError(null);
      setStatus(AVATAR_LAB_STATUS.LOADING_MODEL);
      try {
        await loadSegmenter();
        setStatus(AVATAR_LAB_STATUS.SEGMENTING);
        const raster = await cutoutForeground(bitmap);
        cutoutRasterRef.current = raster;
        runPixelate(raster, params);
      } catch (err) {
        cutoutRasterRef.current = null;
        setResult(null);
        setError(err instanceof Error ? err.message : "No se pudo procesar la imagen.");
        setStatus(AVATAR_LAB_STATUS.ERROR);
      }
    },
    [params, runPixelate]
  );

  const updateParams = useCallback(
    (patch) => {
      setParams((prev) => {
        const next = { ...prev, ...patch };
        if (cutoutRasterRef.current) {
          runPixelate(cutoutRasterRef.current, next);
        }
        return next;
      });
    },
    [runPixelate]
  );

  const reset = useCallback(() => {
    cutoutRasterRef.current = null;
    setParams(DEFAULT_OPTIONS);
    setResult(null);
    setError(null);
    setStatus(AVATAR_LAB_STATUS.IDLE);
  }, []);

  return { status, params, result, error, run, updateParams, reset };
}
