const rooms = new Map();
const lastActivity = new Map();

export function has(code) {
  return rooms.has(code);
}

export function get(code) {
  return rooms.get(code);
}

export function set(code, room) {
  rooms.set(code, room);
  lastActivity.set(code, Date.now());
}

export function remove(code) {
  rooms.delete(code);
  lastActivity.delete(code);
}

export function touch(code) {
  if (rooms.has(code)) {
    lastActivity.set(code, Date.now());
  }
}

export function getLastActivity(code) {
  return lastActivity.get(code);
}

export function allCodes() {
  return [...rooms.keys()];
}
