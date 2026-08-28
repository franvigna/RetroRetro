import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PixelPreview } from "./PixelPreview.jsx";

// jsdom no implementa canvas 2D ni ImageData: se stubean acá, localmente,
// para no afectar las demás suites (ver front/src/test/setup.js, que hoy
// no tiene ningún polyfill de canvas).
describe("PixelPreview", () => {
  let putImageData;
  let originalGetContext;
  let originalImageData;

  beforeEach(() => {
    putImageData = vi.fn();
    originalGetContext = window.HTMLCanvasElement.prototype.getContext;
    window.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ putImageData }));

    originalImageData = globalThis.ImageData;
    globalThis.ImageData = class ImageData {
      constructor(data, width, height) {
        this.data = data;
        this.width = width;
        this.height = height;
      }
    };
  });

  afterEach(() => {
    window.HTMLCanvasElement.prototype.getContext = originalGetContext;
    globalThis.ImageData = originalImageData;
  });

  it("muestra un placeholder cuando no hay raster", () => {
    render(<PixelPreview raster={null} />);
    expect(screen.getByText(/Subí una foto/i)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("pinta el raster en el canvas con putImageData", () => {
    const raster = { width: 2, height: 2, data: new Uint8ClampedArray(16).fill(255) };
    render(<PixelPreview raster={raster} />);

    expect(screen.getByRole("img", { name: /vista previa/i })).toBeInTheDocument();
    expect(putImageData).toHaveBeenCalledTimes(1);
    const [imageData] = putImageData.mock.calls[0];
    expect(imageData.width).toBe(2);
    expect(imageData.height).toBe(2);
  });
});
