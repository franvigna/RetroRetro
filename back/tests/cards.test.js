import { describe, it, expect } from "vitest";
import { addCard, toggleVote, topVotedCards, editCard, deleteCard, CARD_TEXT_MAX_LENGTH } from "../src/domain/cards.js";
import { InvalidActionError, UnauthorizedError } from "../src/domain/errors.js";

function makeRoom(phase, cards = [], { starsPerParticipant = 3, participants = [] } = {}) {
  return { phase, cards, starsPerParticipant, participants };
}

describe("addCard", () => {
  it("acepta una tarjeta con texto y columna válidos para la fase", () => {
    const room = makeRoom("keep_improve_try");
    const result = addCard(room, { column: "keep", text: "Buen pair programming", authorId: "p1", cardId: "c1" });
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]).toMatchObject({ column: "keep", text: "Buen pair programming", authorId: "p1" });
  });

  it("rechaza texto vacío", () => {
    const room = makeRoom("keep_improve_try");
    expect(() => addCard(room, { column: "keep", text: "   ", authorId: "p1", cardId: "c1" })).toThrow(
      InvalidActionError
    );
  });

  it("rechaza columna no válida para la fase actual", () => {
    const room = makeRoom("keep_improve_try");
    expect(() =>
      addCard(room, { column: "action_plan", text: "algo", authorId: "p1", cardId: "c1" })
    ).toThrow(InvalidActionError);
  });

  it("acepta texto de exactamente 512 caracteres", () => {
    const room = makeRoom("keep_improve_try");
    const text = "a".repeat(CARD_TEXT_MAX_LENGTH);
    const result = addCard(room, { column: "keep", text, authorId: "p1", cardId: "c1" });
    expect(result.cards[0].text).toHaveLength(CARD_TEXT_MAX_LENGTH);
  });

  it("rechaza texto de más de 512 caracteres", () => {
    const room = makeRoom("keep_improve_try");
    const text = "a".repeat(CARD_TEXT_MAX_LENGTH + 1);
    expect(() => addCard(room, { column: "keep", text, authorId: "p1", cardId: "c1" })).toThrow(
      InvalidActionError
    );
  });

  it("rechaza agregar tarjetas en una fase sin columnas permitidas", () => {
    const room = makeRoom("grouping_voting");
    expect(() => addCard(room, { column: "keep", text: "algo", authorId: "p1", cardId: "c1" })).toThrow(
      InvalidActionError
    );
  });

  it("rechaza agregar tarjetas durante expression_round (fase hablada, sin tarjetas)", () => {
    const room = makeRoom("expression_round");
    expect(() => addCard(room, { column: "keep", text: "algo", authorId: "p1", cardId: "c1" })).toThrow(
      InvalidActionError
    );
  });

  it("rechaza agregar tarjetas durante hall_of_fame (vista automática de solo lectura)", () => {
    const room = makeRoom("hall_of_fame");
    expect(() => addCard(room, { column: "action_plan", text: "algo", authorId: "p1", cardId: "c1" })).toThrow(
      InvalidActionError
    );
  });

  it("action_plan usa text/assigneeIds", () => {
    const room = makeRoom("action_plan", [], { participants: [{ id: "p1" }, { id: "p2" }] });
    const result = addCard(room, {
      column: "action_plan",
      text: "Migrar a TypeScript",
      assigneeIds: ["p1", "p2"],
      authorId: "p1",
      cardId: "c1",
    });
    expect(result.cards[0]).toMatchObject({
      column: "action_plan",
      text: "Migrar a TypeScript",
      assigneeIds: ["p1", "p2"],
    });
  });

  it("action_plan rechaza text vacío", () => {
    const room = makeRoom("action_plan");
    expect(() =>
      addCard(room, { column: "action_plan", text: "  ", authorId: "p1", cardId: "c1" })
    ).toThrow(InvalidActionError);
  });

  it("action_plan rechaza text de más de 512 caracteres", () => {
    const room = makeRoom("action_plan");
    const text = "a".repeat(CARD_TEXT_MAX_LENGTH + 1);
    expect(() => addCard(room, { column: "action_plan", text, authorId: "p1", cardId: "c1" })).toThrow(
      InvalidActionError
    );
  });

  it("action_plan acepta sin assigneeIds (opcional)", () => {
    const room = makeRoom("action_plan");
    const result = addCard(room, { column: "action_plan", text: "Algo", authorId: "p1", cardId: "c1" });
    expect(result.cards[0].assigneeIds).toEqual([]);
  });

  it("action_plan rechaza un assigneeId que no existe en participants", () => {
    const room = makeRoom("action_plan", [], { participants: [{ id: "p1" }] });
    expect(() =>
      addCard(room, {
        column: "action_plan",
        text: "Algo",
        assigneeIds: ["p1", "fantasma"],
        authorId: "p1",
        cardId: "c1",
      })
    ).toThrow(InvalidActionError);
  });

  it("rechaza columna keep/improve/try fuera de keep_improve_try", () => {
    const room = makeRoom("action_plan");
    expect(() =>
      addCard(room, { column: "keep", text: "algo", authorId: "p1", cardId: "c2" })
    ).toThrow(InvalidActionError);
  });
});

describe("toggleVote", () => {
  it("agrega el voto si el participante no había votado esa tarjeta", () => {
    const room = makeRoom("grouping_voting", [{ id: "c1", column: "keep", text: "x", authorId: "a", votes: [] }]);
    const result = toggleVote(room, { cardId: "c1", participantId: "p1" });
    expect(result.cards[0].votes).toEqual(["p1"]);
  });

  it("quita el voto si el participante ya había votado esa tarjeta (toggle)", () => {
    const room = makeRoom("grouping_voting", [{ id: "c1", column: "keep", text: "x", authorId: "a", votes: ["p1"] }]);
    const result = toggleVote(room, { cardId: "c1", participantId: "p1" });
    expect(result.cards[0].votes).toEqual([]);
  });

  it("rechaza votar una tarjeta inexistente", () => {
    const room = makeRoom("grouping_voting", []);
    expect(() => toggleVote(room, { cardId: "no-existe", participantId: "p1" })).toThrow(InvalidActionError);
  });

  it("rechaza votar fuera de la fase grouping_voting", () => {
    const room = makeRoom("keep_improve_try", [{ id: "c1", column: "keep", text: "x", authorId: "a", votes: [] }]);
    expect(() => toggleVote(room, { cardId: "c1", participantId: "p1" })).toThrow(InvalidActionError);
  });

  it("rechaza un voto extra si el participante ya usó sus 3 estrellas (default)", () => {
    const room = makeRoom("grouping_voting", [
      { id: "c1", column: "keep", text: "a", authorId: "a", votes: ["p1"] },
      { id: "c2", column: "keep", text: "b", authorId: "a", votes: ["p1"] },
      { id: "c3", column: "keep", text: "c", authorId: "a", votes: ["p1"] },
      { id: "c4", column: "keep", text: "d", authorId: "a", votes: [] },
    ]);
    expect(() => toggleVote(room, { cardId: "c4", participantId: "p1" })).toThrow(InvalidActionError);
  });

  it("permite votar de nuevo tras liberar una estrella", () => {
    const room = makeRoom("grouping_voting", [
      { id: "c1", column: "keep", text: "a", authorId: "a", votes: ["p1"] },
      { id: "c2", column: "keep", text: "b", authorId: "a", votes: ["p1"] },
      { id: "c3", column: "keep", text: "c", authorId: "a", votes: ["p1"] },
      { id: "c4", column: "keep", text: "d", authorId: "a", votes: [] },
    ]);
    const afterRemoval = toggleVote(room, { cardId: "c1", participantId: "p1" });
    const afterNewVote = toggleVote(afterRemoval, { cardId: "c4", participantId: "p1" });
    expect(afterNewVote.cards.find((c) => c.id === "c4").votes).toEqual(["p1"]);
  });

  it("respeta un starsPerParticipant de 1 (rechaza el segundo voto)", () => {
    const room = makeRoom(
      "grouping_voting",
      [
        { id: "c1", column: "keep", text: "a", authorId: "a", votes: ["p1"] },
        { id: "c2", column: "keep", text: "b", authorId: "a", votes: [] },
      ],
      { starsPerParticipant: 1 }
    );
    expect(() => toggleVote(room, { cardId: "c2", participantId: "p1" })).toThrow(InvalidActionError);
  });

  it("respeta un starsPerParticipant de 5 (acepta hasta el quinto voto)", () => {
    let room = makeRoom(
      "grouping_voting",
      [
        { id: "c1", column: "keep", text: "a", authorId: "a", votes: [] },
        { id: "c2", column: "keep", text: "b", authorId: "a", votes: [] },
        { id: "c3", column: "keep", text: "c", authorId: "a", votes: [] },
        { id: "c4", column: "keep", text: "d", authorId: "a", votes: [] },
        { id: "c5", column: "keep", text: "e", authorId: "a", votes: [] },
      ],
      { starsPerParticipant: 5 }
    );
    for (const cardId of ["c1", "c2", "c3", "c4", "c5"]) {
      room = toggleVote(room, { cardId, participantId: "p1" });
    }
    expect(room.cards.every((c) => c.votes.includes("p1"))).toBe(true);
  });
});

describe("topVotedCards (Salón de la Fama)", () => {
  it("devuelve vacío si no hay cards", () => {
    expect(topVotedCards([])).toEqual([]);
  });

  it("devuelve las 3 con más votos, ordenadas descendente", () => {
    const cards = [
      { id: "c1", votes: ["p1"] },
      { id: "c2", votes: ["p1", "p2", "p3"] },
      { id: "c3", votes: ["p1", "p2"] },
      { id: "c4", votes: [] },
    ];
    const top = topVotedCards(cards);
    expect(top.map((c) => c.id)).toEqual(["c2", "c3", "c1"]);
  });

  it("incluye más de 3 tarjetas si hay empate en el límite del 3er puesto", () => {
    const cards = [
      { id: "c1", votes: ["p1", "p2", "p3", "p4", "p5"] }, // 5
      { id: "c2", votes: ["p1", "p2", "p3", "p4"] }, // 4
      { id: "c3", votes: ["p1", "p2", "p3"] }, // 3
      { id: "c4", votes: ["p1", "p2", "p6"] }, // 3 -> empate con c3
      { id: "c5", votes: ["p1"] }, // 1
    ];
    const top = topVotedCards(cards);
    expect(top.map((c) => c.id).sort()).toEqual(["c1", "c2", "c3", "c4"]);
  });

  it("devuelve todas las cards si hay menos de 3", () => {
    const cards = [
      { id: "c1", votes: ["p1"] },
      { id: "c2", votes: [] },
    ];
    expect(topVotedCards(cards)).toHaveLength(2);
  });
});

describe("editCard", () => {
  it("permite al autor editar el texto de una tarjeta simple", () => {
    const room = makeRoom("keep_improve_try", [
      { id: "c1", column: "keep", text: "original", authorId: "p1", votes: [] },
    ]);
    const result = editCard(room, { cardId: "c1", text: "editado", participantId: "p1" });
    expect(result.cards[0].text).toBe("editado");
  });

  it("rechaza la edición de alguien que no es el autor", () => {
    const room = makeRoom("keep_improve_try", [
      { id: "c1", column: "keep", text: "original", authorId: "p1", votes: [] },
    ]);
    expect(() => editCard(room, { cardId: "c1", text: "hackeado", participantId: "p2" })).toThrow(
      UnauthorizedError
    );
  });

  it("rechaza editar con texto vacío", () => {
    const room = makeRoom("keep_improve_try", [
      { id: "c1", column: "keep", text: "original", authorId: "p1", votes: [] },
    ]);
    expect(() => editCard(room, { cardId: "c1", text: "  ", participantId: "p1" })).toThrow(
      InvalidActionError
    );
  });

  it("preserva los votos existentes al editar", () => {
    const room = makeRoom("keep_improve_try", [
      { id: "c1", column: "keep", text: "original", authorId: "p1", votes: ["p2"] },
    ]);
    const result = editCard(room, { cardId: "c1", text: "editado", participantId: "p1" });
    expect(result.cards[0].votes).toEqual(["p2"]);
  });

  it("permite al autor editar texto/assigneeIds de una action_plan", () => {
    const room = makeRoom("action_plan", [
      { id: "c1", column: "action_plan", text: "original", assigneeIds: [], authorId: "p1", votes: [] },
    ], { participants: [{ id: "p1" }, { id: "p2" }] });
    const result = editCard(room, {
      cardId: "c1",
      text: "editado",
      assigneeIds: ["p2"],
      participantId: "p1",
    });
    expect(result.cards[0]).toMatchObject({ text: "editado", assigneeIds: ["p2"] });
  });

  it("rechaza editar una tarjeta inexistente", () => {
    const room = makeRoom("keep_improve_try", []);
    expect(() => editCard(room, { cardId: "no-existe", text: "x", participantId: "p1" })).toThrow(
      InvalidActionError
    );
  });
});

describe("deleteCard", () => {
  it("permite al autor eliminar su propia tarjeta", () => {
    const room = makeRoom("keep_improve_try", [
      { id: "c1", column: "keep", text: "x", authorId: "p1", votes: [] },
    ]);
    const result = deleteCard(room, { cardId: "c1", participantId: "p1" });
    expect(result.cards).toHaveLength(0);
  });

  it("rechaza la eliminación de alguien que no es el autor", () => {
    const room = makeRoom("keep_improve_try", [
      { id: "c1", column: "keep", text: "x", authorId: "p1", votes: [] },
    ]);
    expect(() => deleteCard(room, { cardId: "c1", participantId: "p2" })).toThrow(UnauthorizedError);
  });

  it("rechaza eliminar una tarjeta inexistente", () => {
    const room = makeRoom("keep_improve_try", []);
    expect(() => deleteCard(room, { cardId: "no-existe", participantId: "p1" })).toThrow(
      InvalidActionError
    );
  });
});
