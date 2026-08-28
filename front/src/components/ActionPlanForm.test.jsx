import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActionPlanForm } from "./ActionPlanForm.jsx";

const participants = [
  { id: "p1", name: "Ana", role: "host", connected: true },
  { id: "p2", name: "Beto", role: "participant", connected: true },
];

function openAssigneeDropdown() {
  fireEvent.click(screen.getByLabelText("Responsables"));
}

describe("ActionPlanForm", () => {
  it("no envía sin texto", () => {
    const onSubmit = vi.fn();
    render(<ActionPlanForm participants={participants} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText("Agregar"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/no puede estar vacía/)).toBeInTheDocument();
  });

  it("envía payload con text/assigneeIds correctos", () => {
    const onSubmit = vi.fn();
    render(<ActionPlanForm participants={participants} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Acción concreta"), { target: { value: "Documentar deploy" } });
    openAssigneeDropdown();
    fireEvent.click(screen.getByText("Beto"));
    fireEvent.click(screen.getByText("Agregar"));

    expect(onSubmit).toHaveBeenCalledWith({
      text: "Documentar deploy",
      assigneeIds: ["p2"],
    });
  });

  it("el multi-select permite elegir varios responsables", () => {
    const onSubmit = vi.fn();
    render(<ActionPlanForm participants={participants} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Acción concreta"), { target: { value: "Algo" } });
    openAssigneeDropdown();
    fireEvent.click(screen.getByText("Ana"));
    fireEvent.click(screen.getByText("Beto"));
    fireEvent.click(screen.getByText("Agregar"));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ assigneeIds: expect.arrayContaining(["p1", "p2"]) })
    );
  });

  it("'Todo el equipo' selecciona a todos los participantes", () => {
    const onSubmit = vi.fn();
    render(<ActionPlanForm participants={participants} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Acción concreta"), { target: { value: "Algo" } });
    openAssigneeDropdown();
    fireEvent.click(screen.getByText("Todo el equipo"));
    fireEvent.click(screen.getByText("Agregar"));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ assigneeIds: expect.arrayContaining(["p1", "p2"]) })
    );
  });

  it("limpia el formulario tras enviar", () => {
    const onSubmit = vi.fn();
    render(<ActionPlanForm participants={participants} onSubmit={onSubmit} />);

    const textInput = screen.getByLabelText("Acción concreta");
    fireEvent.change(textInput, { target: { value: "Algo" } });
    fireEvent.click(screen.getByText("Agregar"));

    expect(textInput.value).toBe("");
  });

  it("el desplegable de responsables está cerrado por defecto y se abre al tocarlo", () => {
    render(<ActionPlanForm participants={participants} onSubmit={() => {}} />);
    expect(screen.queryByText("Todo el equipo")).not.toBeInTheDocument();
    openAssigneeDropdown();
    expect(screen.getByText("Todo el equipo")).toBeInTheDocument();
  });
});
