// Pipeline puro de pixel art para Avatar Lab (herramienta interna de
// front/src/pages/AvatarLabPage.jsx). Todo acá opera sobre un "raster" plano
// { width, height, data } — data es un Uint8ClampedArray RGBA del mismo
// layout que ImageData.data, pero nunca es un ImageData real: jsdom no tiene
// canvas, así que mantener esta capa sin DOM es lo que permite testear el
// pipeline entero con Vitest sin polyfills.

export const GRID_SIZE = 64;

export const DEFAULT_OPTIONS = {
  colorCount: 16,
  alphaThreshold: 0.5,
  paddingRatio: 0.08,
  saturation: 1.25,
  contrast: 1.1,
  snapToArcadePalette: false,
};

function createRaster(width, height) {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

// bbox del contenido con alpha > alphaThreshold (0-1). null si no hay nada.
export function findContentBounds(raster, alphaThreshold = DEFAULT_OPTIONS.alphaThreshold) {
  const { width, height, data } = raster;
  const cutoff = alphaThreshold * 255;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a > cutoff) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

// Recorte cuadrado centrado en bounds, con padding proporcional al lado más
// grande. Si el cuadrado resultante se sale del raster original, los
// píxeles fuera de rango quedan transparentes (no se estira ni recorta el
// contenido).
export function squareCrop(raster, bounds, paddingRatio = DEFAULT_OPTIONS.paddingRatio) {
  const side = Math.round(Math.max(bounds.width, bounds.height) * (1 + paddingRatio * 2));
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const originX = Math.round(centerX - side / 2);
  const originY = Math.round(centerY - side / 2);

  const out = createRaster(side, side);
  const { width: srcW, height: srcH, data: srcData } = raster;

  for (let y = 0; y < side; y++) {
    const srcY = originY + y;
    if (srcY < 0 || srcY >= srcH) continue;
    for (let x = 0; x < side; x++) {
      const srcX = originX + x;
      if (srcX < 0 || srcX >= srcW) continue;
      const srcI = (srcY * srcW + srcX) * 4;
      const dstI = (y * side + x) * 4;
      out.data[dstI] = srcData[srcI];
      out.data[dstI + 1] = srcData[srcI + 1];
      out.data[dstI + 2] = srcData[srcI + 2];
      out.data[dstI + 3] = srcData[srcI + 3];
    }
  }

  return out;
}

// Downsample a size x size con un box filter que premultiplica alpha antes
// de promediar. Un drawImage() nativo no premultiplica de forma consistente
// entre browsers: el negro de los píxeles totalmente transparentes "sangra"
// como halo oscuro en los bordes del personaje. Promediando r*a/g*a/b*a y
// dividiendo por la SUMA de alphas (no por la cantidad de píxeles) ese halo
// desaparece.
export function downsampleToGrid(raster, size = GRID_SIZE) {
  const { width: srcW, height: srcH, data: srcData } = raster;
  const out = createRaster(size, size);

  for (let gy = 0; gy < size; gy++) {
    const y0 = Math.floor((gy * srcH) / size);
    const y1 = Math.max(Math.floor(((gy + 1) * srcH) / size), y0 + 1);
    for (let gx = 0; gx < size; gx++) {
      const x0 = Math.floor((gx * srcW) / size);
      const x1 = Math.max(Math.floor(((gx + 1) * srcW) / size), x0 + 1);

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumA = 0;
      let n = 0;

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * srcW + x) * 4;
          const a = srcData[i + 3];
          sumR += srcData[i] * a;
          sumG += srcData[i + 1] * a;
          sumB += srcData[i + 2] * a;
          sumA += a;
          n++;
        }
      }

      const outI = (gy * size + gx) * 4;
      out.data[outI + 3] = n > 0 ? sumA / n : 0;
      if (sumA > 0) {
        out.data[outI] = sumR / sumA;
        out.data[outI + 1] = sumG / sumA;
        out.data[outI + 2] = sumB / sumA;
      }
    }
  }

  return out;
}

// Binariza el alpha (0 o 255) para que no queden bordes semi-transparentes.
export function hardenAlpha(raster, alphaThreshold = DEFAULT_OPTIONS.alphaThreshold) {
  const cutoff = alphaThreshold * 255;
  const out = { width: raster.width, height: raster.height, data: Uint8ClampedArray.from(raster.data) };
  for (let i = 3; i < out.data.length; i += 4) {
    out.data[i] = out.data[i] > cutoff ? 255 : 0;
  }
  return out;
}

function clamp255(v) {
  return Math.max(0, Math.min(255, v));
}

// Ajuste de contraste y saturación sobre los píxeles con alpha > 0.
// Contraste primero (respecto al gris medio), saturación después (respecto
// a la luminancia del propio píxel ya contrastado).
export function adjustColors(raster, { saturation = 1, contrast = 1 } = {}) {
  const out = { width: raster.width, height: raster.height, data: Uint8ClampedArray.from(raster.data) };
  const { data } = out;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;

    let r = clamp255((data[i] - 128) * contrast + 128);
    let g = clamp255((data[i + 1] - 128) * contrast + 128);
    let b = clamp255((data[i + 2] - 128) * contrast + 128);

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    r = clamp255(luminance + (r - luminance) * saturation);
    g = clamp255(luminance + (g - luminance) * saturation);
    b = clamp255(luminance + (b - luminance) * saturation);

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  return out;
}

function colorDistanceSq(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function makeBox(pixels) {
  let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
  for (const [r, g, b] of pixels) {
    if (r < rMin) rMin = r;
    if (r > rMax) rMax = r;
    if (g < gMin) gMin = g;
    if (g > gMax) gMax = g;
    if (b < bMin) bMin = b;
    if (b > bMax) bMax = b;
  }
  return { pixels, rMin, rMax, gMin, gMax, bMin, bMax };
}

function boxRange(box) {
  return Math.max(box.rMax - box.rMin, box.gMax - box.gMin, box.bMax - box.bMin);
}

function splitBox(box) {
  const rangeR = box.rMax - box.rMin;
  const rangeG = box.gMax - box.gMin;
  const rangeB = box.bMax - box.bMin;
  const axis = rangeR >= rangeG && rangeR >= rangeB ? 0 : rangeG >= rangeB ? 1 : 2;

  const sorted = [...box.pixels].sort((a, b) => a[axis] - b[axis]);
  const mid = Math.floor(sorted.length / 2);
  return [makeBox(sorted.slice(0, mid)), makeBox(sorted.slice(mid))];
}

// Cuantización de color determinística por median cut (sin dependencia
// externa): a la resolución de entrada (≤1024px de lado) la diferencia
// visual contra k-means es nula, y estas ~60 líneas quedan testeadas y
// entendidas en vez de ser una caja negra.
export function buildPalette(raster, colorCount) {
  const { data } = raster;
  const pixels = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 255) pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (pixels.length === 0) return [];

  let boxes = [makeBox(pixels)];
  while (boxes.length < colorCount) {
    const splittable = boxes.filter((b) => b.pixels.length >= 2 && boxRange(b) > 0);
    if (splittable.length === 0) break;
    const target = splittable.reduce((a, b) => (boxRange(a) * a.pixels.length >= boxRange(b) * b.pixels.length ? a : b));
    boxes = boxes.filter((b) => b !== target);
    boxes.push(...splitBox(target));
  }

  return boxes.map((box) => {
    const n = box.pixels.length;
    const sum = box.pixels.reduce((acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b], [0, 0, 0]);
    return [Math.round(sum[0] / n), Math.round(sum[1] / n), Math.round(sum[2] / n)];
  });
}

// Mapea cada pixel opaco al color más cercano de la paleta (distancia
// euclídea al cuadrado). El alpha no se toca.
export function applyPalette(raster, palette) {
  const out = { width: raster.width, height: raster.height, data: Uint8ClampedArray.from(raster.data) };
  if (palette.length === 0) return out;
  const { data } = out;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const pixel = [data[i], data[i + 1], data[i + 2]];
    let best = palette[0];
    let bestDist = colorDistanceSq(pixel, best);
    for (let p = 1; p < palette.length; p++) {
      const dist = colorDistanceSq(pixel, palette[p]);
      if (dist < bestDist) {
        bestDist = dist;
        best = palette[p];
      }
    }
    data[i] = best[0];
    data[i + 1] = best[1];
    data[i + 2] = best[2];
  }

  return out;
}

// Acerca cada color de la paleta al acento de theme.css más cercano, si
// queda a distancia <= maxDistance. Así un avatar generado desde una foto
// convive visualmente con los 48 de AVATARS en vez de verse ajeno.
export function snapPaletteToTheme(palette, themeRgb, maxDistance = 40) {
  const maxDistSq = maxDistance * maxDistance;
  return palette.map((color) => {
    let best = null;
    let bestDist = Infinity;
    for (const themeColor of themeRgb) {
      const dist = colorDistanceSq(color, themeColor);
      if (dist < bestDist) {
        bestDist = dist;
        best = themeColor;
      }
    }
    return best !== null && bestDist <= maxDistSq ? best : color;
  });
}

// Compone el pipeline entero. Es la única función que llama la UI.
// Devuelve null si el raster de entrada no tiene contenido con alpha
// suficiente (ej. la segmentación no encontró a nadie en la foto).
export function pixelate(raster, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const bounds = findContentBounds(raster, opts.alphaThreshold);
  if (!bounds) return null;

  let working = squareCrop(raster, bounds, opts.paddingRatio);
  working = downsampleToGrid(working, GRID_SIZE);
  working = adjustColors(working, { saturation: opts.saturation, contrast: opts.contrast });
  working = hardenAlpha(working, opts.alphaThreshold);

  let palette = buildPalette(working, opts.colorCount);
  if (opts.snapToArcadePalette && opts.themeRgb) {
    palette = snapPaletteToTheme(palette, opts.themeRgb);
  }
  working = applyPalette(working, palette);

  return { raster: working, palette };
}
