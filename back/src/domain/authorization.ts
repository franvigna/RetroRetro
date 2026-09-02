import { UnauthorizedError } from "./errors.js";
import type { Room, Card } from "./types.js";

export function assertIsHost(room: Room, participantId: string, action: string): void {
  if (room.hostId !== participantId) {
    throw new UnauthorizedError(action);
  }
}

export function assertIsCardAuthor(card: Card, participantId: string, action: string): void {
  if (card.authorId !== participantId) {
    throw new UnauthorizedError(action);
  }
}
