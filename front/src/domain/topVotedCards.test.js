import { describe, it, expect } from "vitest";
import { topVotedCards } from "./topVotedCards.js";

function card(id, voteCount) {
  return { id, column: "keep", text: `card ${id}`, authorId: "p1", votes: Array.from({ length: voteCount }, (_, i) => `v${i}`) };
}

describe("topVotedCards", () => {
  it("devuelve un array vacío si no hay tarjetas", () => {
    expect(topVotedCards([])).toEqual([]);
  });

  it("ordena por votes.length descendente y toma las primeras 3", () => {
    const cards = [card("a", 1), card("b", 5), card("c", 3), card("d", 2)];
    const result = topVotedCards(cards);
    expect(result.map((c) => c.id)).toEqual(["b", "c", "d"]);
  });

  it("incluye todas las tarjetas empatadas en el límite del 3er puesto (puede devolver más de 3)", () => {
    const cards = [card("a", 5), card("b", 4), card("c", 3), card("d", 3), card("e", 1)];
    const result = topVotedCards(cards);
    expect(result.map((c) => c.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("devuelve todo el array si tiene 3 o menos elementos", () => {
    const cards = [card("a", 1), card("b", 2)];
    const result = topVotedCards(cards);
    expect(result).toHaveLength(2);
  });
});
