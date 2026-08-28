import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CardItem } from "./CardItem.jsx";
import { AVATARS } from "../domain/avatars.js";

const participants = [
  { id: "p1", name: "Cisco", role: "host", connected: true, avatarId: AVATARS[0].id },
  { id: "p2", name: "Ana", role: "participant", connected: true },
];
const participantsById = Object.fromEntries(participants.map((p) => [p.id, p]));

const simpleCard = { id: "c1", column: "keep", text: "Original", authorId: "p1", votes: [] };

describe("CardItem — edición y eliminación (HU-F09c)", () => {
  it("no muestra lápiz/X en una tarjeta ajena", () => {
    render(
      <ul>
        <CardItem
          card={simpleCard}
          authorName="Cisco"
          participantsById={participantsById}
          participants={participants}
          isOwn={false}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </ul>
    );
    expect(screen.queryByLabelText("Editar tarjeta")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Eliminar tarjeta")).not.toBeInTheDocument();
  });

  it("muestra lápiz/X en una tarjeta propia", () => {
    render(
      <ul>
        <CardItem
          card={simpleCard}
          authorName="Cisco"
          participantsById={participantsById}
          participants={participants}
          isOwn={true}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </ul>
    );
    expect(screen.getByLabelText("Editar tarjeta")).toBeInTheDocument();
    expect(screen.getByLabelText("Eliminar tarjeta")).toBeInTheDocument();
  });

  it("el lápiz habilita edición inline y Guardar llama a onEdit con el nuevo texto", () => {
    const onEdit = vi.fn();
    render(
      <ul>
        <CardItem
          card={simpleCard}
          authorName="Cisco"
          participantsById={participantsById}
          participants={participants}
          isOwn={true}
          onEdit={onEdit}
          onDelete={vi.fn()}
        />
      </ul>
    );
    fireEvent.click(screen.getByLabelText("Editar tarjeta"));
    const input = screen.getByLabelText("Editar tarjeta");
    fireEvent.change(input, { target: { value: "Corregido" } });
    fireEvent.click(screen.getByText("Guardar"));

    expect(onEdit).toHaveBeenCalledWith("c1", "keep", "Corregido");
  });

  it("doble click en la tarjeta propia habilita edición inline", () => {
    render(
      <ul>
        <CardItem
          card={simpleCard}
          authorName="Cisco"
          participantsById={participantsById}
          participants={participants}
          isOwn={true}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </ul>
    );
    fireEvent.doubleClick(screen.getByText("Original"));
    expect(screen.getByLabelText("Editar tarjeta")).toBeInTheDocument();
  });

  it("doble click en una tarjeta ajena no hace nada", () => {
    render(
      <ul>
        <CardItem
          card={simpleCard}
          authorName="Cisco"
          participantsById={participantsById}
          participants={participants}
          isOwn={false}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </ul>
    );
    fireEvent.doubleClick(screen.getByText("Original"));
    expect(screen.queryByLabelText(/Editar tarjeta/)).not.toBeInTheDocument();
  });

  it("la X llama a onDelete con el id de la tarjeta, sin confirmación", () => {
    const onDelete = vi.fn();
    render(
      <ul>
        <CardItem
          card={simpleCard}
          authorName="Cisco"
          participantsById={participantsById}
          participants={participants}
          isOwn={true}
          onEdit={vi.fn()}
          onDelete={onDelete}
        />
      </ul>
    );
    fireEvent.click(screen.getByLabelText("Eliminar tarjeta"));
    expect(onDelete).toHaveBeenCalledWith("c1");
  });

  it("editar una action_plan propia usa el formulario de acción concreta/responsables", () => {
    const onEdit = vi.fn();
    const actionPlanCard = {
      id: "c2",
      column: "action_plan",
      text: "Original",
      assigneeIds: ["p2"],
      authorId: "p1",
      votes: [],
    };
    render(
      <ul>
        <CardItem
          card={actionPlanCard}
          authorName="Cisco"
          participantsById={participantsById}
          participants={participants}
          isOwn={true}
          onEdit={onEdit}
          onDelete={vi.fn()}
        />
      </ul>
    );
    fireEvent.click(screen.getByLabelText("Editar tarjeta"));
    fireEvent.change(screen.getByLabelText("Acción concreta"), { target: { value: "Editado" } });
    fireEvent.click(screen.getByText("Guardar"));

    expect(onEdit).toHaveBeenCalledWith(
      "c2",
      "action_plan",
      expect.objectContaining({ text: "Editado", assigneeIds: ["p2"] })
    );
  });
});

describe("CardItem — tarjeta de acción concreta (Nivel 7)", () => {
  const actionPlanCard = {
    id: "c3",
    column: "action_plan",
    text: "Documentar el deploy",
    assigneeIds: ["p1"],
    authorId: "p2",
    votes: [],
  };

  it("no muestra quién creó la acción concreta", () => {
    render(
      <ul>
        <CardItem
          card={actionPlanCard}
          authorName="Ana"
          participantsById={participantsById}
          participants={participants}
          isOwn={false}
        />
      </ul>
    );
    expect(screen.queryByText("Ana")).not.toBeInTheDocument();
  });

  it("muestra el nombre y el avatar de cada responsable asignado", () => {
    render(
      <ul>
        <CardItem
          card={actionPlanCard}
          authorName="Ana"
          participantsById={participantsById}
          participants={participants}
          isOwn={false}
        />
      </ul>
    );
    expect(screen.getByText("Cisco")).toBeInTheDocument();
    expect(screen.getByAltText("")).toHaveAttribute("src", AVATARS[0].src);
  });

  it("una tarjeta de keep/improve/try sigue mostrando a quién la escribió", () => {
    render(
      <ul>
        <CardItem
          card={simpleCard}
          authorName="Cisco"
          participantsById={participantsById}
          participants={participants}
          isOwn={false}
        />
      </ul>
    );
    expect(screen.getByText("Cisco")).toBeInTheDocument();
  });
});
