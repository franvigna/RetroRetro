import { InvalidActionError } from "./errors.js";
import { assertIsCardAuthor } from "./authorization.js";
import type { Room, Card, CardColumn } from "./types.js";

const ALLOWED_COLUMNS_BY_PHASE: Partial<Record<Room["phase"], CardColumn[]>> = {
  keep_improve_try: ["keep", "improve", "try"],
  action_plan: ["action_plan"],
};

export const CARD_TEXT_MAX_LENGTH = 512;

interface AddCardPayload {
  // Sin validar todavía al entrar — column viaja tal cual desde el socket
  // (ver socket/events.ts), se valida acá mismo contra las columnas
  // permitidas de la fase actual, igual que el resto de los campos de
  // entrada no confiables del dominio (ver resolveAvatarId en room.ts).
  column: unknown;
  authorId: string;
  cardId: string;
  text?: string;
  assigneeIds?: string[];
}

export function addCard(room: Room, payload: AddCardPayload): Room {
  const { column, authorId, cardId } = payload;
  const allowedColumns = ALLOWED_COLUMNS_BY_PHASE[room.phase];
  if (!allowedColumns) {
    throw new InvalidActionError("card:add", `no se pueden agregar tarjetas en la fase ${room.phase}`);
  }
  if (typeof column !== "string" || !allowedColumns.includes(column as CardColumn)) {
    throw new InvalidActionError("card:add", `columna ${column} no válida para la fase ${room.phase}`);
  }

  // Validado arriba: column es un string presente en allowedColumns.
  const validColumn = column as CardColumn;
  const card =
    validColumn === "action_plan"
      ? buildActionPlanCard(room, payload, { authorId, cardId }, "card:add")
      : buildSimpleCard(payload, { column: validColumn, authorId, cardId }, "card:add");

  return { ...room, cards: [...room.cards, card] };
}

function buildSimpleCard(
  { text }: { text?: string },
  { column, authorId, cardId }: { column: CardColumn; authorId: string; cardId: string },
  action: string
): Card {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) {
    throw new InvalidActionError(action, "el texto de la tarjeta no puede estar vacío");
  }
  if (trimmed.length > CARD_TEXT_MAX_LENGTH) {
    throw new InvalidActionError(action, `el texto de la tarjeta no puede superar los ${CARD_TEXT_MAX_LENGTH} caracteres`);
  }
  return { id: cardId, column, text: trimmed, authorId, votes: [] };
}

function buildActionPlanCard(
  room: Room,
  { text, assigneeIds }: { text?: string; assigneeIds?: string[] },
  { authorId, cardId }: { authorId: string; cardId: string },
  action: string
): Card {
  const trimmedText = text?.trim() ?? "";
  if (!trimmedText) {
    throw new InvalidActionError(action, "el texto de la tarjeta no puede estar vacío");
  }
  if (trimmedText.length > CARD_TEXT_MAX_LENGTH) {
    throw new InvalidActionError(action, `el texto de la tarjeta no puede superar los ${CARD_TEXT_MAX_LENGTH} caracteres`);
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
    text: trimmedText,
    assigneeIds: resolvedAssignees,
    authorId,
    votes: [],
  };
}

interface EditCardPayload {
  cardId: unknown;
  participantId: string;
  text?: string;
  assigneeIds?: string[];
}

// Solo el autor puede editar/eliminar su propia tarjeta (validado acá con
// InvalidActionError como fallback; la autorización real por identidad se
// hace en el handler antes de llamar, ver socket/handlers/cardHandlers.js).
export function editCard(room: Room, { cardId, participantId, ...payload }: EditCardPayload): Room {
  const cardIndex = room.cards.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    throw new InvalidActionError("card:edit", "la tarjeta no existe");
  }
  const existing = room.cards[cardIndex];
  assertIsCardAuthor(existing, participantId, "card:edit");
  // Seguro: cardIndex !== -1 solo si algún Card.id (string) coincide.
  const validCardId = cardId as string;

  const updated =
    existing.column === "action_plan"
      ? buildActionPlanCard(room, payload, { authorId: existing.authorId, cardId: validCardId }, "card:edit")
      : buildSimpleCard(payload, { column: existing.column, authorId: existing.authorId, cardId: validCardId }, "card:edit");

  const newCards = [...room.cards];
  newCards[cardIndex] = { ...updated, votes: existing.votes };
  return { ...room, cards: newCards };
}

export function deleteCard(room: Room, { cardId, participantId }: { cardId: unknown; participantId: string }): Room {
  const existing = room.cards.find((c) => c.id === cardId);
  if (!existing) {
    throw new InvalidActionError("card:delete", "la tarjeta no existe");
  }
  assertIsCardAuthor(existing, participantId, "card:delete");
  return { ...room, cards: room.cards.filter((c) => c.id !== cardId) };
}

export function toggleVote(room: Room, { cardId, participantId }: { cardId: unknown; participantId: string }): Room {
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

// Top 10 del Salón de la Fama con ranking denso: tarjetas con igual cantidad
// de votos comparten puesto (1, 1, 2, 2...), incluyendo todos los empates
// que correspondan al décimo puntaje distinto.
export function topVotedCards(cards: Card[], maxRank = 10): Card[] {
  const votedCards = cards.filter((card) => card.votes.length > 0);
  if (votedCards.length === 0) return [];
  const sorted = [...votedCards].sort((a, b) => b.votes.length - a.votes.length);
  const topVoteCounts = [...new Set(sorted.map((card) => card.votes.length))].slice(0, maxRank);
  return sorted.filter((card) => topVoteCounts.includes(card.votes.length));
}
