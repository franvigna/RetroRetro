import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockRun = vi.fn();
const mockUpdateParams = vi.fn();
let mockState;

const AVATAR_LAB_STATUS = {
  IDLE: "idle",
  LOADING_MODEL: "loading-model",
  SEGMENTING: "segmenting",
  READY: "ready",
  ERROR: "error",
};

vi.mock("../hooks/useAvatarLab.js", () => ({
  AVATAR_LAB_STATUS,
  useAvatarLab: () => mockState,
}));

vi.mock("../domain/backgroundRemoval.js", () => ({
  isSupported: () => true,
}));

const { DEFAULT_OPTIONS } = await import("../domain/pixelArt.js");
const { AvatarLabPage } = await import("./AvatarLabPage.jsx");

function baseState(overrides = {}) {
  return {
    status: AVATAR_LAB_STATUS.IDLE,
    params: DEFAULT_OPTIONS,
    result: null,
    error: null,
    run: mockRun,
    updateParams: mockUpdateParams,
    reset: vi.fn(),
    ...overrides,
  };
}

describe("AvatarLabPage", () => {
  let originalCreateImageBitmap;

  beforeEach(() => {
    mockRun.mockClear();
    mockUpdateParams.mockClear();
    mockState = baseState();
    originalCreateImageBitmap = globalThis.createImageBitmap;
    globalThis.createImageBitmap = vi.fn().mockResolvedValue({ width: 10, height: 10 });
  });

  afterEach(() => {
    globalThis.createImageBitmap = originalCreateImageBitmap;
  });

  it("muestra la zona de carga de foto", () => {
    render(<AvatarLabPage />);
    expect(screen.getByText(/Arrastrá una foto/i)).toBeInTheDocument();
  });

  it("corre el pipeline al subir una foto válida", async () => {
    render(<AvatarLabPage />);
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Foto de origen"), { target: { files: [file] } });
    await waitFor(() => expect(mockRun).toHaveBeenCalled());
  });

  it("muestra el mensaje de carga del modelo", () => {
    mockState = baseState({ status: AVATAR_LAB_STATUS.LOADING_MODEL });
    render(<AvatarLabPage />);
    expect(screen.getByRole("status")).toHaveTextContent(/Cargando el modelo/i);
  });

  it("muestra el error cuando la segmentación no encuentra a nadie", () => {
    mockState = baseState({
      status: AVATAR_LAB_STATUS.ERROR,
      error: "No se encontró ningún personaje en la foto. Probá con otra imagen o bajá el umbral.",
    });
    render(<AvatarLabPage />);
    expect(screen.getByText(/No se encontró ningún personaje/i)).toBeInTheDocument();
  });

  it("deshabilita los controles hasta que se suba una foto", () => {
    render(<AvatarLabPage />);
    expect(screen.getByLabelText(/Cantidad de colores/i)).toBeDisabled();
  });

  it("habilita los controles cuando hay un resultado", () => {
    // PixelPreview pinta el raster en un <canvas> real; jsdom no implementa
    // getContext, así que se stubea localmente (ver PixelPreview.test.jsx).
    const originalGetContext = window.HTMLCanvasElement.prototype.getContext;
    window.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ putImageData: vi.fn() }));
    const originalImageData = globalThis.ImageData;
    globalThis.ImageData = class ImageData {
      constructor(data, width, height) {
        this.data = data;
        this.width = width;
        this.height = height;
      }
    };

    mockState = baseState({
      status: AVATAR_LAB_STATUS.READY,
      result: { raster: { width: 32, height: 32, data: new Uint8ClampedArray(32 * 32 * 4) }, palette: [[0, 0, 0]] },
    });
    render(<AvatarLabPage />);
    expect(screen.getByLabelText(/Cantidad de colores/i)).toBeEnabled();

    window.HTMLCanvasElement.prototype.getContext = originalGetContext;
    globalThis.ImageData = originalImageData;
  });
});
