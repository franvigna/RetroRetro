import { describe, it, expect } from "vitest";
import {
  GRID_SIZE,
  findContentBounds,
  squareCrop,
  downsampleToGrid,
  hardenAlpha,
  buildPalette,
  applyPalette,
  pixelate,
} from "./pixelArt.js";

function raster(width, height, fillFn) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = fillFn(x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return { width, height, data };
}

describe("findContentBounds", () => {
  it("devuelve null si el raster está totalmente transparente", () => {
    const r = raster(4, 4, () => [0, 0, 0, 0]);
    expect(findContentBounds(r)).toBeNull();
  });

  it("devuelve el bbox exacto del contenido opaco", () => {
    const r = raster(6, 6, (x, y) => (x >= 1 && x <= 3 && y >= 2 && y <= 4 ? [255, 0, 0, 255] : [0, 0, 0, 0]));
    expect(findContentBounds(r)).toEqual({ x: 1, y: 2, width: 3, height: 3 });
  });
});

describe("squareCrop", () => {
  it("clampea en los bordes del raster sin estirar el contenido", () => {
    const r = raster(4, 4, () => [10, 20, 30, 255]);
    const cropped = squareCrop(r, { x: 0, y: 0, width: 4, height: 4 }, 0.5);
    expect(cropped.width).toBe(cropped.height);
    // el padding empuja el recorte más allá del raster original: los bordes
    // extra deben quedar transparentes, no repetir/estirar píxeles.
    expect(cropped.data[3]).toBe(0);
  });
});

describe("downsampleToGrid", () => {
  it("promedia un bloque 4x4 uniforme a 2x2 con el mismo color", () => {
    const r = raster(4, 4, () => [100, 150, 200, 255]);
    const out = downsampleToGrid(r, 2);
    expect(out.width).toBe(2);
    expect(Array.from(out.data.slice(0, 4))).toEqual([100, 150, 200, 255]);
  });

  it("no deja que el negro transparente oscurezca una celda opaca vecina (premultiply)", () => {
    // celda superior izquierda: mitad rojo opaco, mitad negro transparente.
    const r = raster(2, 2, (x, y) => (x === 0 && y === 0 ? [255, 0, 0, 255] : [0, 0, 0, 0]));
    const out = downsampleToGrid(r, 1);
    expect(out.data[0]).toBe(255);
    expect(out.data[1]).toBe(0);
    expect(out.data[2]).toBe(0);
  });

  it("siempre devuelve un raster de tamaño size x size", () => {
    const r = raster(7, 5, () => [1, 2, 3, 255]);
    const out = downsampleToGrid(r, GRID_SIZE);
    expect(out.width).toBe(GRID_SIZE);
    expect(out.height).toBe(GRID_SIZE);
  });
});

describe("hardenAlpha", () => {
  it("binariza el alpha según el umbral", () => {
    const r = raster(2, 1, (x) => [0, 0, 0, x === 0 ? 100 : 200]);
    const out = hardenAlpha(r, 0.5);
    expect(out.data[3]).toBe(0);
    expect(out.data[7]).toBe(255);
  });
});

describe("buildPalette", () => {
  it("devuelve como máximo colorCount colores", () => {
    const r = raster(8, 8, (x, y) => [(x * 32) % 256, (y * 32) % 256, 128, 255]);
    const palette = buildPalette(r, 4);
    expect(palette.length).toBeLessThanOrEqual(4);
  });

  it("ignora los píxeles transparentes", () => {
    const r = raster(2, 1, (x) => (x === 0 ? [255, 0, 0, 255] : [0, 255, 0, 0]));
    const palette = buildPalette(r, 4);
    expect(palette).toEqual([[255, 0, 0]]);
  });

  it("devuelve un array vacío si no hay ningún píxel opaco", () => {
    const r = raster(2, 2, () => [0, 0, 0, 0]);
    expect(buildPalette(r, 4)).toEqual([]);
  });
});

describe("applyPalette", () => {
  it("mapea cada pixel al color más cercano de la paleta sin tocar el alpha", () => {
    const r = raster(1, 1, () => [10, 10, 10, 200]);
    const out = applyPalette(r, [[0, 0, 0], [255, 255, 255]]);
    expect(Array.from(out.data)).toEqual([0, 0, 0, 200]);
  });
});

describe("pixelate", () => {
  it("devuelve null si el raster de entrada no tiene contenido", () => {
    const r = raster(4, 4, () => [0, 0, 0, 0]);
    expect(pixelate(r)).toBeNull();
  });

  it(`siempre produce un raster de ${GRID_SIZE}x${GRID_SIZE} cuando hay contenido`, () => {
    const r = raster(10, 6, (x, y) => (x >= 2 && x <= 7 ? [200, 100, 50, 255] : [0, 0, 0, 0]));
    const result = pixelate(r);
    expect(result.raster.width).toBe(GRID_SIZE);
    expect(result.raster.height).toBe(GRID_SIZE);
    expect(result.palette.length).toBeGreaterThan(0);
  });
});
