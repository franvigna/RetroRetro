import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HallOfFame } from "./HallOfFame.jsx";

const participantsById = { p1: { id: "p1", name: "Ana" } };

function card(id, text, voteCount, column = "keep") {
  return { id, column, text, authorId: "p1", votes: Array.from({ length: voteCount }, (_, i) => `v${i}`) };
}

describe("HallOfFame", () => {
  it("muestra todas las tarjetas hasta el puesto 10, ordenadas de mayor a menor", () => {
    const cards = [card("a", "Baja", 1), card("b", "Alta", 5), card("c", "Media", 3)];
    render(<HallOfFame cards={cards} participantsById={participantsById} />);
    const items = screen.getAllByText(/★ \d/);
    expect(items[0].closest("li")).toHaveTextContent("Alta");
    expect(items[1].closest("li")).toHaveTextContent("Media");
    expect(items[2].closest("li")).toHaveTextContent("Baja");
  });

  it("asigna el mismo puesto a tarjetas empatadas y usa ranking denso", () => {
    const cards = [card("a", "Primero A", 5), card("b", "Primero B", 5), card("c", "Segundo A", 3), card("d", "Segundo B", 3)];
    render(<HallOfFame cards={cards} participantsById={participantsById} />);
    const items = screen.getAllByRole("listitem").filter((item) => item.classList.contains("hof-item"));
    expect(items.map((item) => item.querySelector(".hof-rank").textContent)).toEqual(["1º", "1º", "2º", "2º"]);
  });

  it("muestra una pill con el tipo y color original de cada columna", () => {
    const cards = [
      card("a", "Mantener", 3, "keep"),
      card("b", "Mejorar", 2, "improve"),
      card("c", "Intentar", 1, "try"),
    ];
    render(<HallOfFame cards={cards} participantsById={participantsById} />);

    expect(screen.getByText("Keep")).toHaveAttribute("data-column", "keep");
    expect(screen.getByText("Improve")).toHaveAttribute("data-column", "improve");
    expect(screen.getByText("Try")).toHaveAttribute("data-column", "try");
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

  it("muestra el mismo mensaje cuando todas las tarjetas tienen 0 votos", () => {
    render(<HallOfFame cards={[card("a", "Sin votos", 0)]} participantsById={participantsById} />);
    expect(screen.queryByText("Sin votos")).not.toBeInTheDocument();
    expect(screen.getByText(/Todavía no hay tarjetas votadas/)).toBeInTheDocument();
  });
});
