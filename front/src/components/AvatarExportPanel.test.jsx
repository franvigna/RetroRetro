import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AvatarExportPanel } from "./AvatarExportPanel.jsx";

const RASTER = { width: 2, height: 2, data: new Uint8ClampedArray(16).fill(200) };

describe("AvatarExportPanel", () => {
  let originalGetContext;
  let originalToBlob;
  let originalImageData;
  let originalCreateObjectURL;
  let originalRevokeObjectURL;
  let originalClipboard;
  let originalClipboardItem;
  let originalAnchorClick;

  beforeEach(() => {
    originalGetContext = window.HTMLCanvasElement.prototype.getContext;
    window.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ putImageData: vi.fn() }));

    originalToBlob = window.HTMLCanvasElement.prototype.toBlob;
    window.HTMLCanvasElement.prototype.toBlob = function toBlob(cb) {
      cb(new Blob(["fake"], { type: "image/png" }));
    };

    originalImageData = globalThis.ImageData;
    globalThis.ImageData = class ImageData {
      constructor(data, width, height) {
        this.data = data;
        this.width = width;
        this.height = height;
      }
    };

    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:fake");
    URL.revokeObjectURL = vi.fn();

    originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined), write: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });

    originalClipboardItem = window.ClipboardItem;
    window.ClipboardItem = class ClipboardItem {};

    originalAnchorClick = window.HTMLAnchorElement.prototype.click;
    window.HTMLAnchorElement.prototype.click = vi.fn();
  });

  afterEach(() => {
    window.HTMLCanvasElement.prototype.getContext = originalGetContext;
    window.HTMLCanvasElement.prototype.toBlob = originalToBlob;
    globalThis.ImageData = originalImageData;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    Object.defineProperty(navigator, "clipboard", { value: originalClipboard, configurable: true });
    window.ClipboardItem = originalClipboardItem;
    window.HTMLAnchorElement.prototype.click = originalAnchorClick;
  });

  it("deshabilita la descarga cuando no hay raster", () => {
    render(<AvatarExportPanel raster={null} />);
    expect(screen.getByRole("button", { name: /Descargar PNG/i })).toBeDisabled();
  });

  it("arma el slug y el snippet a partir del nombre ingresado", () => {
    render(<AvatarExportPanel raster={RASTER} />);
    fireEvent.change(screen.getByLabelText(/Nombre del personaje/i), { target: { value: "Foto de Cisco" } });

    expect(screen.getByText("Archivo: avatar-foto-de-cisco.png")).toBeInTheDocument();
    const snippet = screen.getByText(/import fotoDeCisco/);
    expect(snippet).toHaveTextContent('id: "foto-de-cisco"');
    expect(snippet).toHaveTextContent('label: "Foto de Cisco"');
  });

  it("descarga el PNG al hacer click", async () => {
    render(<AvatarExportPanel raster={RASTER} />);
    fireEvent.change(screen.getByLabelText(/Nombre del personaje/i), { target: { value: "Cisco" } });
    fireEvent.click(screen.getByRole("button", { name: /Descargar PNG/i }));

    await waitFor(() => expect(window.HTMLAnchorElement.prototype.click).toHaveBeenCalled());
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("copia el snippet al portapapeles y muestra confirmación", async () => {
    render(<AvatarExportPanel raster={RASTER} />);
    fireEvent.change(screen.getByLabelText(/Nombre del personaje/i), { target: { value: "Cisco" } });
    fireEvent.click(screen.getByRole("button", { name: /Copiar snippet/i }));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    expect(await screen.findByRole("status")).toHaveTextContent("Copiado");
  });

  it("no muestra 'Copiar imagen' si el navegador no soporta ClipboardItem", () => {
    window.ClipboardItem = undefined;
    render(<AvatarExportPanel raster={RASTER} />);
    expect(screen.queryByRole("button", { name: /Copiar imagen/i })).not.toBeInTheDocument();
  });
});
