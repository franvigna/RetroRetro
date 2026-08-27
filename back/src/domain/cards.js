import { InvalidActionError } from "./errors.js";
import { assertIsCardAuthor } from "./authorization.js";

const ALLOWED_COLUMNS_BY_PHASE = {
  keep_improve_try: ["keep", "improve", "try"],
  action_plan: ["action_plan"],
};

export const CARD_TEXT_MAX_LENGTH = 512;

export function addCard(room, payload) {
  const { column, authorId, cardId } = payload;
  const allowedColumns = ALLOWED_COLUMNS_BY_PHASE[room.phase];
  if (!allowedColumns) {
    throw new InvalidActionError("card:add", `no se pueden agregar tarjetas en la fase ${room.phase}`);
  }
  if (!allowedColumns.includes(column)) {
    throw new InvalidActionError("card:add", `columna ${column} no válida para la fase ${room.phase}`);
  }

  const card =
    column === "action_plan"
      ? buildActionPlanCard(room, payload, { authorId, cardId }, "card:add")
      : buildSimpleCard(payload, { column, authorId, cardId }, "card:add");

  return { ...room, cards: [...room.cards, card] };
}

function buildSimpleCard({ text }, { column, authorId, cardId }, action) {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) {
    throw new InvalidActionError(action, "el texto de la tarjeta no puede estar vacío");
  }
  if (trimmed.length > CARD_TEXT_MAX_LENGTH) {
    throw new InvalidActionError(action, `el texto de la tarjeta no puede superar los ${CARD_TEXT_MAX_LENGTH} caracteres`);
  }
  return { id: cardId, column, text: trimmed, authorId, votes: [] };
}

function buildActionPlanCard(room, { title, description, assigneeIds }, { authorId, cardId }, action) {
  const trimmedTitle = title?.trim() ?? "";
  if (!trimmedTitle) {
    throw new InvalidActionError(action, "el título de la tarjeta no puede estar vacío");
  }
  if (trimmedTitle.length > CARD_TEXT_MAX_LENGTH) {
    throw new InvalidActionError(action, `el título de la tarjeta no puede superar los ${CARD_TEXT_MAX_LENGTH} caracteres`);
  }
  const trimmedDescription = description?.trim() || "";
  if (trimmedDescription.length > CARD_TEXT_MAX_LENGTH) {
    throw new InvalidActionError(action, `la descripción no puede superar los ${CARD_TEXT_MAX_LENGTH} caracteres`);
  }
  const resolvedAssignees = assigneeIds ?? [];
  for (const id of resolvedAssignees) {
    if (!room.participants.some((p) => p.id === id)) {
      throw new InvalidActionError(action, `assigneeIds contiene un participante inexistente: ${id}`);
    }
  }
  return {
    id: cardId,
    column: "action_plan",
    title: trimmedTitle,
    description: trimmedDescription,
    assigneeIds: resolvedAssignees,
    authorId,
    votes: [],
  };
}

// Solo el autor puede editar/eliminar su propia tarjeta (validado acá con
// InvalidActionError como fallback; la autorización real por identidad se
// hace en el handler antes de llamar, ver socket/handlers/cardHandlers.js).
export function editCard(room, { cardId, participantId, ...payload }) {
  const cardIndex = room.cards.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    throw new InvalidActionError("card:edit", "la tarjeta no existe");
  }
  const existing = room.cards[cardIndex];
  assertIsCardAuthor(existing, participantId, "card:edit");

  const updated =
    existing.column === "action_plan"
      ? buildActionPlanCard(room, payload, { authorId: existing.authorId, cardId }, "card:edit")
      : buildSimpleCard(payload, { column: existing.column, authorId: existing.authorId, cardId }, "card:edit");

  const newCards = [...room.cards];
  newCards[cardIndex] = { ...updated, votes: existing.votes };
  return { ...room, cards: newCards };
}

export function deleteCard(room, { cardId, participantId }) {
  const existing = room.cards.find((c) => c.id === cardId);
  if (!existing) {
    throw new InvalidActionError("card:delete", "la tarjeta no existe");
  }
  assertIsCardAuthor(existing, participantId, "card:delete");
  return { ...room, cards: room.cards.filter((c) => c.id !== cardId) };
}

export function toggleVote(room, { cardId, participantId }) {
  if (room.phase !== "grouping_voting") {
    throw new InvalidActionError("card:vote", "solo se puede votar durante grouping_voting");
  }

  const cardIndex = room.cards.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    throw new InvalidActionError("card:vote", "la tarjeta no existe");
  }

  const card = room.cards[cardIndex];
  const alreadyVoted = card.votes.includes(participantId);

  if (!alreadyVoted) {
    const usedVotes = room.cards.filter((c) => c.votes.includes(participantId)).length;
    if (usedVotes >= room.starsPerParticipant) {
      throw new InvalidActionError("card:vote", "no quedan estrellas disponibles");
    }
  }

  const newVotes = alreadyVoted
    ? card.votes.filter((id) => id !== participantId)
    : [...card.votes, participantId];

  const newCards = [...room.cards];
  newCards[cardIndex] = { ...card, votes: newVotes };
  return { ...room, cards: newCards };
}

// Top 3 del Salón de la Fama (Nivel 6): ordena por votes.length descendente. Si hay empate
// en el límite del 3er puesto, incluye TODAS las tarjetas empatadas (puede devolver más de 3).
export function topVotedCards(cards, limit = 3) {
  if (cards.length === 0) return [];
  const sorted = [...cards].sort((a, b) => b.votes.length - a.votes.length);
  if (sorted.length <= limit) return sorted;

  const cutoffVotes = sorted[limit - 1].votes.length;
  return sorted.filter((c) => c.votes.length >= cutoffVotes);
}
