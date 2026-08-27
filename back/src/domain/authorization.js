import { UnauthorizedError } from "./errors.js";

export function assertIsHost(room, participantId, action) {
  if (room.hostId !== participantId) {
    throw new UnauthorizedError(action);
  }
}

export function assertIsCardAuthor(card, participantId, action) {
  if (card.authorId !== participantId) {
    throw new UnauthorizedError(action);
  }
}
