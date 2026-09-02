import type { Room } from "../domain/types.js";

const rooms = new Map<string, Room>();
const lastActivity = new Map<string, number>();

export function has(code: string): boolean {
  return rooms.has(code);
}

export function get(code: string): Room | undefined {
  return rooms.get(code);
}

export function set(code: string, room: Room): void {
  rooms.set(code, room);
  lastActivity.set(code, Date.now());
}

export function remove(code: string): void {
  rooms.delete(code);
  lastActivity.delete(code);
}

export function touch(code: string): void {
  if (rooms.has(code)) {
    lastActivity.set(code, Date.now());
  }
}

export function getLastActivity(code: string): number | undefined {
  return lastActivity.get(code);
}

export function allCodes(): string[] {
  return [...rooms.keys()];
}
