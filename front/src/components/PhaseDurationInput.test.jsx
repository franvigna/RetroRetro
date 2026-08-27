import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PhaseDurationInput } from "./PhaseDurationInput.jsx";

describe("PhaseDurationInput", () => {
  it("muestra el valor recibido", () => {
    render(<PhaseDurationInput label="Bienvenida" value={3} onChange={() => {}} note="nota" />);
    expect(screen.getByRole("spinbutton")).toHaveValue(3);
  });

  it("el tooltip no está visible por defecto", () => {
    render(<PhaseDurationInput label="Bienvenida" value={3} onChange={() => {}} note="Recomendado: 3 min." />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("muestra el tooltip con la nota al hacer hover del trigger", () => {
    render(<PhaseDurationInput label="Bienvenida" value={3} onChange={() => {}} note="Recomendado: 3 min." />);
    fireEvent.mouseEnter(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Recomendado: 3 min.");
  });

  it("muestra el tooltip al enfocar el trigger por teclado y lo oculta al salir", () => {
    render(<PhaseDurationInput label="Bienvenida" value={3} onChange={() => {}} note="Recomendado: 3 min." />);
    const trigger = screen.getByRole("button");
    fireEvent.focus(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.blur(trigger);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("dispara onChange con el nuevo valor numérico", () => {
    const onChange = vi.fn();
    render(<PhaseDurationInput label="Bienvenida" value={3} onChange={onChange} note="nota" />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "7" } });
    expect(onChange).toHaveBeenCalledWith(7);
  });
});
