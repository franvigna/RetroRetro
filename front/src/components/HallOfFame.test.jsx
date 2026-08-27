import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HallOfFame } from "./HallOfFame.jsx";

const participantsById = { p1: { id: "p1", name: "Ana" } };

function card(id, text, voteCount) {
  return { id, column: "keep", text, authorId: "p1", votes: Array.from({ length: voteCount }, (_, i) => `v${i}`) };
}

describe("HallOfFame", () => {
  it("muestra las 3 tarjetas más votadas ordenadas de mayor a menor", () => {
    const cards = [card("a", "Baja", 1), card("b", "Alta", 5), card("c", "Media", 3)];
    render(<HallOfFame cards={cards} participantsById={participantsById} />);
    const items = screen.getAllByText(/★ \d/);
    expect(items[0].closest("li")).toHaveTextContent("Alta");
    expect(items[1].closest("li")).toHaveTextContent("Media");
    expect(items[2].closest("li")).toHaveTextContent("Baja");
  });

  it("muestra más de 3 tarjetas si hay empate en el límite del 3er puesto", () => {
    const cards = [card("a", "Primero", 5), card("b", "Segundo", 4), card("c", "TercA", 3), card("d", "TercB", 3)];
    render(<HallOfFame cards={cards} participantsById={participantsById} />);
    expect(screen.getByText("Primero")).toBeInTheDocument();
    expect(screen.getByText("Segundo")).toBeInTheDocument();
    expect(screen.getByText("TercA")).toBeInTheDocument();
    expect(screen.getByText("TercB")).toBeInTheDocument();
  });

  it("no muestra formulario de agregar tarjetas (pantalla de solo lectura)", () => {
    const cards = [card("a", "Algo", 1)];
    render(<HallOfFame cards={cards} participantsById={participantsById} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("muestra mensaje cuando no hay tarjetas", () => {
    render(<HallOfFame cards={[]} participantsById={participantsById} />);
    expect(screen.getByText(/Todavía no hay tarjetas/)).toBeInTheDocument();
  });
});
