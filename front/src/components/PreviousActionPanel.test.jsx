import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PreviousActionPanel } from "./PreviousActionPanel.jsx";

describe("PreviousActionPanel", () => {
  it("muestra el texto libre cargado por el host", () => {
    render(<PreviousActionPanel notes="Documentar el proceso de deploy" />);
    expect(screen.getByText("Documentar el proceso de deploy")).toBeInTheDocument();
  });

  it("muestra un mensaje claro si no hay notas cargadas", () => {
    render(<PreviousActionPanel notes="" />);
    expect(screen.getByText(/no cargó ningún pendiente/)).toBeInTheDocument();
  });

  it("muestra cada línea no vacía como un ítem separado, cada uno con botón ✕ y botón ✓", () => {
    render(<PreviousActionPanel notes={"uno\n\ndos\ntres"} checks={{ 1: true }} canToggle />);
    expect(screen.getByText("uno")).toBeInTheDocument();
    expect(screen.getByText("dos")).toBeInTheDocument();
    expect(screen.getByText("tres")).toBeInTheDocument();

    // 3 líneas x 2 botones (✕ y ✓) cada una.
    expect(screen.getAllByRole("button")).toHaveLength(6);
  });

  it("el ítem marcado como cumplido tiene su botón ✓ presionado y el ✕ no", () => {
    render(<PreviousActionPanel notes={"uno\ndos"} checks={{ 0: true }} canToggle />);
    const noButtons = screen.getAllByLabelText("Marcar como no cumplido");
    const yesButtons = screen.getAllByLabelText("Marcar como cumplido");

    expect(yesButtons[0]).toHaveAttribute("aria-pressed", "true");
    expect(noButtons[0]).toHaveAttribute("aria-pressed", "false");
  });

  it("el ítem marcado como no cumplido tiene su botón ✕ presionado y el ✓ no", () => {
    render(<PreviousActionPanel notes={"uno\ndos"} checks={{ 0: false }} canToggle />);
    const noButtons = screen.getAllByLabelText("Marcar como no cumplido");
    const yesButtons = screen.getAllByLabelText("Marcar como cumplido");

    expect(noButtons[0]).toHaveAttribute("aria-pressed", "true");
    expect(yesButtons[0]).toHaveAttribute("aria-pressed", "false");
  });

  it("un ítem sin marcar todavía no tiene ningún botón presionado", () => {
    render(<PreviousActionPanel notes="uno" checks={{}} canToggle />);
    expect(screen.getByLabelText("Marcar como cumplido")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Marcar como no cumplido")).toHaveAttribute("aria-pressed", "false");
  });

  it("clickear el botón ✓ llama a onSetItem con el índice y done=true", () => {
    const onSetItem = vi.fn();
    render(<PreviousActionPanel notes={"uno\ndos"} checks={{}} onSetItem={onSetItem} canToggle />);

    screen.getAllByLabelText("Marcar como cumplido")[1].click();
    expect(onSetItem).toHaveBeenCalledWith(1, true);
  });

  it("clickear el botón ✕ llama a onSetItem con el índice y done=false", () => {
    const onSetItem = vi.fn();
    render(<PreviousActionPanel notes={"uno\ndos"} checks={{}} onSetItem={onSetItem} canToggle />);

    screen.getAllByLabelText("Marcar como no cumplido")[1].click();
    expect(onSetItem).toHaveBeenCalledWith(1, false);
  });

  it("deshabilita los botones si canToggle es false", () => {
    render(<PreviousActionPanel notes="uno" checks={{}} canToggle={false} />);
    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
  });
});
