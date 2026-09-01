import { describe, it, expect } from "vitest";
import { topVotedCards } from "./topVotedCards.js";

function card(id, voteCount) {
  return { id, column: "keep", text: `card ${id}`, authorId: "p1", votes: Array.from({ length: voteCount }, (_, i) => `v${i}`) };
}

describe("topVotedCards", () => {
  it("devuelve un array vacío si no hay tarjetas", () => {
    expect(topVotedCards([])).toEqual([]);
  });

  it("excluye todas las tarjetas que tienen 0 votos", () => {
    const cards = [card("votada", 2), card("sin-votos-a", 0), card("sin-votos-b", 0)];
    expect(topVotedCards(cards).map((item) => item.id)).toEqual(["votada"]);
    expect(topVotedCards([card("sin-votos", 0)])).toEqual([]);
  });

  it("ordena todas las tarjetas por votes.length descendente hasta el puesto 10", () => {
    const cards = [card("a", 1), card("b", 5), card("c", 3), card("d", 2)];
    const result = topVotedCards(cards);
    expect(result.map((c) => c.id)).toEqual(["b", "c", "d", "a"]);
  });

  it("considera cada cantidad de votos distinta como un puesto e incluye empates del puesto 10", () => {
    const cards = Array.from({ length: 12 }, (_, index) => card(`c${index + 1}`, 12 - index));
    cards.push(card("empate-10", 3));
    const result = topVotedCards(cards);
    expect(result.map((c) => c.id)).toContain("c10");
    expect(result.map((c) => c.id)).toContain("empate-10");
    expect(result.map((c) => c.id)).not.toContain("c11");
  });

  it("devuelve todas las tarjetas votadas si tiene 10 puestos o menos", () => {
    const cards = [card("a", 1), card("b", 2)];
    const result = topVotedCards(cards);
    expect(result).toHaveLength(2);
  });
});
