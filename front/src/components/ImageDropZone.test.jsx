import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImageDropZone } from "./ImageDropZone.jsx";

function makeFile({ name = "photo.jpg", type = "image/jpeg", size } = {}) {
  const file = new File(["contenido"], name, { type });
  if (size !== undefined) {
    Object.defineProperty(file, "size", { value: size });
  }
  return file;
}

describe("ImageDropZone", () => {
  let originalCreateImageBitmap;

  beforeEach(() => {
    originalCreateImageBitmap = globalThis.createImageBitmap;
    globalThis.createImageBitmap = vi.fn().mockResolvedValue({ width: 100, height: 100 });
  });

  afterEach(() => {
    globalThis.createImageBitmap = originalCreateImageBitmap;
  });

  it("muestra la instrucción de arrastrar o hacer click", () => {
    render(<ImageDropZone onImageReady={() => {}} onError={() => {}} />);
    expect(screen.getByText(/Arrastrá una foto/i)).toBeInTheDocument();
  });

  it("entrega { file, bitmap } para un archivo válido", async () => {
    const onImageReady = vi.fn();
    render(<ImageDropZone onImageReady={onImageReady} onError={() => {}} />);
    const file = makeFile();

    fireEvent.change(screen.getByLabelText("Foto de origen"), { target: { files: [file] } });

    await waitFor(() => expect(onImageReady).toHaveBeenCalledTimes(1));
    expect(globalThis.createImageBitmap).toHaveBeenCalledWith(file, { imageOrientation: "from-image" });
    expect(onImageReady.mock.calls[0][0].file).toBe(file);
  });

  it("rechaza un formato no soportado", () => {
    const onError = vi.fn();
    render(<ImageDropZone onImageReady={() => {}} onError={onError} />);
    fireEvent.change(screen.getByLabelText("Foto de origen"), {
      target: { files: [makeFile({ name: "doc.pdf", type: "application/pdf" })] },
    });
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/no soportado/i));
  });

  it("rechaza HEIC con un mensaje específico", () => {
    const onError = vi.fn();
    render(<ImageDropZone onImageReady={() => {}} onError={onError} />);
    fireEvent.change(screen.getByLabelText("Foto de origen"), {
      target: { files: [makeFile({ name: "IMG_001.HEIC", type: "" })] },
    });
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/HEIC/));
  });

  it("rechaza un archivo demasiado pesado", () => {
    const onError = vi.fn();
    render(<ImageDropZone onImageReady={() => {}} onError={onError} />);
    fireEvent.change(screen.getByLabelText("Foto de origen"), {
      target: { files: [makeFile({ size: 20 * 1024 * 1024 })] },
    });
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/pesa demasiado/i));
  });
});
