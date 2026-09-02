import type { Room } from "../domain/types.js";

const INACTIVE_ROOM_TIMEOUT_MS = 30 * 60 * 1000; // 30 min sin nadie conectado

export function shouldReleaseRoom(room: Room, lastActivityAt: number, now: number): boolean {
  const hasConnectedParticipants = room.participants.some((p) => p.connected);
  if (hasConnectedParticipants) return false;
  return now - lastActivityAt > INACTIVE_ROOM_TIMEOUT_MS;
}

interface SweepInactiveRoomsDeps {
  allCodes: () => string[];
  get: (code: string) => Room | undefined;
  getLastActivity: (code: string) => number | undefined;
  remove: (code: string) => void;
  onRemove?: (code: string) => void;
  now: number;
}

export function sweepInactiveRooms({ allCodes, get, getLastActivity, remove, onRemove, now }: SweepInactiveRoomsDeps): void {
  for (const code of allCodes()) {
    const room = get(code);
    const lastActivityAt = getLastActivity(code);
    if (room && lastActivityAt !== undefined && shouldReleaseRoom(room, lastActivityAt, now)) {
      remove(code);
      onRemove?.(code);
    }
  }
}
