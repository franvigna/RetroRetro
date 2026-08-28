import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PixelArtControls } from "./PixelArtControls.jsx";
import { DEFAULT_OPTIONS } from "../domain/pixelArt.js";

describe("PixelArtControls", () => {
  it("muestra los valores recibidos en cada control", () => {
    render(<PixelArtControls params={DEFAULT_OPTIONS} onChange={() => {}} />);
    expect(screen.getByLabelText(/Cantidad de colores/i)).toHaveValue(String(DEFAULT_OPTIONS.colorCount));
    expect(screen.getByLabelText(/Acercar colores/i)).not.toBeChecked();
  });

  it("dispara onChange con un patch al mover el slider de colores", () => {
    const onChange = vi.fn();
    render(<PixelArtControls params={DEFAULT_OPTIONS} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Cantidad de colores/i), { target: { value: "24" } });
    expect(onChange).toHaveBeenCalledWith({ colorCount: 24 });
  });

  it("dispara onChange al tildar el snap a paleta arcade", () => {
    const onChange = vi.fn();
    render(<PixelArtControls params={DEFAULT_OPTIONS} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/Acercar colores/i));
    expect(onChange).toHaveBeenCalledWith({ snapToArcadePalette: true });
  });

  it("deshabilita todos los controles cuando disabled=true", () => {
    render(<PixelArtControls params={DEFAULT_OPTIONS} onChange={() => {}} disabled />);
    expect(screen.getByLabelText(/Cantidad de colores/i)).toBeDisabled();
    expect(screen.getByLabelText(/Acercar colores/i)).toBeDisabled();
  });
});
