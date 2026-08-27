const INACTIVE_ROOM_TIMEOUT_MS = 30 * 60 * 1000; // 30 min sin nadie conectado

export function shouldReleaseRoom(room, lastActivityAt, now) {
  const hasConnectedParticipants = room.participants.some((p) => p.connected);
  if (hasConnectedParticipants) return false;
  return now - lastActivityAt > INACTIVE_ROOM_TIMEOUT_MS;
}

export function sweepInactiveRooms({ allCodes, get, getLastActivity, remove, onRemove, now }) {
  for (const code of allCodes()) {
    const room = get(code);
    const lastActivityAt = getLastActivity(code);
    if (room && shouldReleaseRoom(room, lastActivityAt, now)) {
      remove(code);
      onRemove?.(code);
    }
  }
}
