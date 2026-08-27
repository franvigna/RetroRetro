import { describe, it, expect, vi } from "vitest";
import { shouldReleaseRoom, sweepInactiveRooms } from "../src/rooms/cleanup.js";

const THIRTY_ONE_MIN_MS = 31 * 60 * 1000;

describe("shouldReleaseRoom", () => {
  it("libera una sala sin participantes conectados con última actividad vieja", () => {
    const room = { participants: [{ id: "p1", connected: false }] };
    expect(shouldReleaseRoom(room, 0, THIRTY_ONE_MIN_MS)).toBe(true);
  });

  it("no libera una sala con al menos un participante conectado, aunque el tiempo haya pasado", () => {
    const room = { participants: [{ id: "p1", connected: true }] };
    expect(shouldReleaseRoom(room, 0, THIRTY_ONE_MIN_MS)).toBe(false);
  });

  it("no libera una sala inactiva pero reciente", () => {
    const room = { participants: [{ id: "p1", connected: false }] };
    expect(shouldReleaseRoom(room, 0, 5000)).toBe(false);
  });
});

describe("sweepInactiveRooms", () => {
  it("elimina solo las salas que corresponde y notifica onRemove", () => {
    const rooms = {
      "RETRO-AAAA": { participants: [{ id: "p1", connected: false }] },
      "RETRO-BBBB": { participants: [{ id: "p2", connected: true }] },
    };
    const lastActivity = { "RETRO-AAAA": 0, "RETRO-BBBB": 0 };
    const onRemove = vi.fn();

    sweepInactiveRooms({
      allCodes: () => Object.keys(rooms),
      get: (code) => rooms[code],
      getLastActivity: (code) => lastActivity[code],
      remove: vi.fn((code) => delete rooms[code]),
      onRemove,
      now: THIRTY_ONE_MIN_MS,
    });

    expect(rooms["RETRO-AAAA"]).toBeUndefined();
    expect(rooms["RETRO-BBBB"]).toBeDefined();
    expect(onRemove).toHaveBeenCalledWith("RETRO-AAAA");
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
