import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CardColumn } from "./CardColumn.jsx";

const participantsById = { p1: { id: "p1", name: "Ana" } };

describe("CardColumn — formulario de agregar tarjeta", () => {
  it("no permite enviar texto vacío", () => {
    const onAddCard = vi.fn();
    render(
      <CardColumn
        column="keep"
        cards={[]}
        participantsById={participantsById}
        canAddCard
        showVote={false}
        currentParticipantId="p1"
        remainingVotes={3}
        onAddCard={onAddCard}
        onVote={() => {}}
      />
    );

    fireEvent.click(screen.getByText("Agregar"));
    expect(onAddCard).not.toHaveBeenCalled();
    expect(screen.getByText(/no puede estar vacía/)).toBeInTheDocument();
  });

  it("envía la tarjeta con texto válido y limpia el input", () => {
    const onAddCard = vi.fn();
    render(
      <CardColumn
        column="keep"
        cards={[]}
        participantsById={participantsById}
        canAddCard
        showVote={false}
        currentParticipantId="p1"
        remainingVotes={3}
        onAddCard={onAddCard}
        onVote={() => {}}
      />
    );

    const input = screen.getByLabelText("Nueva tarjeta");
    fireEvent.change(input, { target: { value: "Buen trabajo en equipo" } });
    fireEvent.click(screen.getByText("Agregar"));

    expect(onAddCard).toHaveBeenCalledWith("keep", "Buen trabajo en equipo");
    expect(input.value).toBe("");
  });

  it("no muestra el formulario cuando canAddCard=false (ej: fase de votación)", () => {
    render(
      <CardColumn
        column="keep"
        cards={[]}
        participantsById={participantsById}
        canAddCard={false}
        showVote
        currentParticipantId="p1"
        remainingVotes={3}
        onAddCard={() => {}}
        onVote={() => {}}
      />
    );
    expect(screen.queryByLabelText("Nueva tarjeta")).not.toBeInTheDocument();
  });

  it("muestra el botón de estrella por cada card cuando showVote=true", () => {
    const cards = [{ id: "c1", column: "keep", text: "algo", authorId: "p1", votes: [] }];
    render(
      <CardColumn
        column="keep"
        cards={cards}
        participantsById={participantsById}
        canAddCard={false}
        showVote
        currentParticipantId="p1"
        remainingVotes={3}
        onAddCard={() => {}}
        onVote={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: /Dar tu estrella/ })).toBeInTheDocument();
  });

  it("muestra la pregunta disparadora correspondiente a cada columna keep/improve/try", () => {
    const { rerender } = render(
      <CardColumn
        column="keep"
        cards={[]}
        participantsById={participantsById}
        canAddCard
        showVote={false}
        currentParticipantId="p1"
        remainingVotes={3}
        onAddCard={() => {}}
        onVote={() => {}}
      />
    );
    expect(screen.getByText("¿Qué funcionó y hay que mantener?")).toBeInTheDocument();

    rerender(
      <CardColumn
        column="improve"
        cards={[]}
        participantsById={participantsById}
        canAddCard
        showVote={false}
        currentParticipantId="p1"
        remainingVotes={3}
        onAddCard={() => {}}
        onVote={() => {}}
      />
    );
    expect(screen.getByText("¿Qué se puede mejorar?")).toBeInTheDocument();
  });

  it("no muestra pregunta disparadora en la columna action_plan", () => {
    render(
      <CardColumn
        column="action_plan"
        cards={[]}
        participantsById={participantsById}
        participants={[]}
        canAddCard
        showVote={false}
        currentParticipantId="p1"
        remainingVotes={3}
        onAddCard={() => {}}
        onVote={() => {}}
      />
    );
    expect(screen.queryByText(/¿Qué/)).not.toBeInTheDocument();
  });
});
