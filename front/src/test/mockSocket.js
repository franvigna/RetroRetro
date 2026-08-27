import { vi } from "vitest";

// Socket falso mínimo compatible con la API que usa RoomContext:
// on/off/emit/connect, y una propiedad `connected` + `id` mutable para
// simular los distintos estados que dispara el context.
export function createMockSocket() {
  const listeners = new Map();

  const socket = {
    id: "mock-socket-id",
    connected: false,
    connect: vi.fn(() => {
      socket.connected = true;
    }),
    disconnect: vi.fn(() => {
      socket.connected = false;
    }),
    emit: vi.fn(),
    on: vi.fn((event, handler) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
    }),
    off: vi.fn((event, handler) => {
      listeners.get(event)?.delete(handler);
    }),
    // Helper de test: dispara todos los handlers registrados para `event`.
    trigger(event, payload) {
      listeners.get(event)?.forEach((handler) => handler(payload));
    },
  };

  return socket;
}
