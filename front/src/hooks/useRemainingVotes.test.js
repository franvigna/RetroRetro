import { describe, it, expect } from "vitest";
import { useRemainingVotes } from "./useRemainingVotes.js";

function makeRoom(cardsVotes, starsPerParticipant = 3) {
  return {
    starsPerParticipant,
    cards: cardsVotes.map((votes, i) => ({ id: `card-${i}`, votes })),
  };
}

describe("useRemainingVotes (cálculo puro de presentación)", () => {
  it("devuelve room.starsPerParticipant si el participante no votó nada", () => {
    const room = makeRoom([[], [], []]);
    expect(useRemainingVotes(room, "p1")).toBe(3);
  });

  it("resta un voto por cada card que incluye al participante actual", () => {
    const room = makeRoom([["p1"], ["p1"], []]);
    expect(useRemainingVotes(room, "p1")).toBe(1);
  });

  it("llega a 0 cuando usó todas sus estrellas", () => {
    const room = makeRoom([["p1"], ["p1"], ["p1"]]);
    expect(useRemainingVotes(room, "p1")).toBe(0);
  });

  it("no cuenta votos de otros participantes", () => {
    const room = makeRoom([["p2"], ["p2"], ["p2"]]);
    expect(useRemainingVotes(room, "p1")).toBe(3);
  });

  it("respeta un starsPerParticipant distinto del default (host lo configuró más alto)", () => {
    const room = makeRoom([["p1"], ["p1"]], 8);
    expect(useRemainingVotes(room, "p1")).toBe(6);
  });

  it("devuelve el default (3) si no hay room o participantId todavía", () => {
    expect(useRemainingVotes(null, "p1")).toBe(3);
    expect(useRemainingVotes(makeRoom([]), null)).toBe(3);
  });
});
