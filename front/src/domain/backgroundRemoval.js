// Único módulo con efectos secundarios del pipeline de Avatar Lab: motor de
// segmentación por IA (MediaPipe Tasks Vision, modelo "selfie_segmenter",
// Apache-2.0, gratis, sin API key — se descartó @imgly/background-removal
// por licencia AGPL-3.0 y ~40-80MB de descarga para un modelo genérico cuya
// ventaja se pierde igual a la resolución final de pixelArt.js).
//
// Queda detrás de este adaptador a propósito: cambiar de motor más adelante
// (por ejemplo a selfie_multiclass para forzar paletas por región) implica
// tocar solo este archivo, no el resto del pipeline en pixelArt.js.

const WASM_BASE_URL =
  import.meta.env.VITE_MEDIAPIPE_WASM_BASE ??
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

const MAX_DIMENSION = 1024;

let segmenterPromise = null;

// Carga memoizada: el runtime WASM (~3MB) y el modelo (~250KB) se piden una
// sola vez por carga de página — el browser cachea la respuesta después.
export function loadSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
      return ImageSegmenter.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "IMAGE",
        outputConfidenceMasks: true,
      });
    })();
  }
  return segmenterPromise;
}

// Dibuja el bitmap en un OffscreenCanvas, escalado a ≤MAX_DIMENSION en el
// lado más largo (guarda de memoria: una foto de 12MP son ~48MB como RGBA).
function drawBitmapToRaster(bitmap, maxDimension) {
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  return { canvas, raster: { width, height, data: Uint8ClampedArray.from(imageData.data) } };
}

// La máscara que devuelve MediaPipe puede tener otra resolución que la
// imagen fuente — se reescala por interpolación bilineal en vez de asumir
// que coinciden.
function resampleMaskBilinear(maskData, maskW, maskH, targetW, targetH) {
  if (maskW === targetW && maskH === targetH) return maskData;

  const out = new Float32Array(targetW * targetH);
  for (let y = 0; y < targetH; y++) {
    const srcY = (y / (targetH - 1 || 1)) * (maskH - 1);
    const y0 = Math.floor(srcY);
    const y1 = Math.min(y0 + 1, maskH - 1);
    const fy = srcY - y0;
    for (let x = 0; x < targetW; x++) {
      const srcX = (x / (targetW - 1 || 1)) * (maskW - 1);
      const x0 = Math.floor(srcX);
      const x1 = Math.min(x0 + 1, maskW - 1);
      const fx = srcX - x0;

      const v00 = maskData[y0 * maskW + x0];
      const v10 = maskData[y0 * maskW + x1];
      const v01 = maskData[y1 * maskW + x0];
      const v11 = maskData[y1 * maskW + x1];
      const top = v00 + (v10 - v00) * fx;
      const bottom = v01 + (v11 - v01) * fx;
      out[y * targetW + x] = top + (bottom - top) * fy;
    }
  }
  return out;
}

// Corre la segmentación sobre un ImageBitmap (una foto subida por el
// usuario) y devuelve un raster RGBA donde el canal alpha es la confianza
// de "persona" de MediaPipe (0-255) — listo para pixelArt.js.
export async function cutoutForeground(bitmap) {
  const { canvas, raster } = drawBitmapToRaster(bitmap, MAX_DIMENSION);
  const segmenter = await loadSegmenter();
  const result = segmenter.segment(canvas);
  const mask = result.confidenceMasks?.[0];

  if (!mask) {
    result.close?.();
    throw new Error("La segmentación no devolvió ninguna máscara.");
  }

  try {
    const maskData = mask.getAsFloat32Array();
    const resampled = resampleMaskBilinear(maskData, mask.width, mask.height, raster.width, raster.height);

    const out = { width: raster.width, height: raster.height, data: Uint8ClampedArray.from(raster.data) };
    for (let i = 0; i < resampled.length; i++) {
      out.data[i * 4 + 3] = Math.round(resampled[i] * 255);
    }
    return out;
  } finally {
    // Las máscaras de MediaPipe son objetos WASM que hay que liberar a
    // mano: sin este close() se acumula un leak de memoria por cada foto.
    mask.close();
    result.close?.();
  }
}

export function isSupported() {
  return (
    typeof WebAssembly !== "undefined" &&
    typeof createImageBitmap === "function" &&
    typeof OffscreenCanvas !== "undefined"
  );
}
