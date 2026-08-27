import { describe, it, expect } from "vitest";
import { createRoom, resolveAvatarId, resolveSecondsPerSpeaker, AVATAR_IDS } from "../src/domain/room.js";
import { DEFAULT_PHASE_DURATIONS_SECONDS } from "../src/domain/phases.js";
import { InvalidActionError } from "../src/domain/errors.js";

const baseArgs = {
  code: "RETRO-4X7B",
  hostId: "socket-1",
  hostName: "Cisco",
  now: 1000,
};

describe("createRoom", () => {
  it("crea una sala en waiting_room con el host como único participante", () => {
    const room = createRoom(baseArgs);
    expect(room.phase).toBe("waiting_room");
    expect(room.hostId).toBe("socket-1");
    expect(room.participants).toEqual([
      { id: "socket-1", name: "Cisco", role: "host", connected: true, avatarId: null },
    ]);
    expect(room.cards).toEqual([]);
    expect(room.phaseHistory).toEqual([]);
  });

  it("rechaza hostName vacío", () => {
    expect(() => createRoom({ ...baseArgs, hostName: "" })).toThrow(InvalidActionError);
  });

  it("usa los defaults completos si no se pasa phaseDurations", () => {
    const room = createRoom(baseArgs);
    expect(room.phaseDurations).toEqual(DEFAULT_PHASE_DURATIONS_SECONDS);
  });

  it("mergea phaseDurations parcial con los defaults", () => {
    const room = createRoom({ ...baseArgs, phaseDurations: { welcome: 120 } });
    expect(room.phaseDurations.welcome).toBe(120);
    expect(room.phaseDurations.action_plan).toBe(DEFAULT_PHASE_DURATIONS_SECONDS.action_plan);
  });

  it("rechaza un valor de phaseDurations fuera de rango", () => {
    expect(() => createRoom({ ...baseArgs, phaseDurations: { welcome: 10 } })).toThrow(
      InvalidActionError
    );
    expect(() => createRoom({ ...baseArgs, phaseDurations: { welcome: 10000 } })).toThrow(
      InvalidActionError
    );
  });

  it("usa el default de starsPerParticipant (3) si no se pasa", () => {
    const room = createRoom(baseArgs);
    expect(room.starsPerParticipant).toBe(3);
  });

  it("acepta un starsPerParticipant válido dentro de 1-10", () => {
    const room = createRoom({ ...baseArgs, starsPerParticipant: 7 });
    expect(room.starsPerParticipant).toBe(7);
  });

  it("rechaza un starsPerParticipant fuera de rango o no entero", () => {
    expect(() => createRoom({ ...baseArgs, starsPerParticipant: 0 })).toThrow(InvalidActionError);
    expect(() => createRoom({ ...baseArgs, starsPerParticipant: 11 })).toThrow(InvalidActionError);
    expect(() => createRoom({ ...baseArgs, starsPerParticipant: 2.5 })).toThrow(InvalidActionError);
  });

  it("guarda avatarId null si no se pasa ninguno", () => {
    const room = createRoom(baseArgs);
    expect(room.participants[0].avatarId).toBeNull();
  });

  it("guarda un avatarId válido del set fijo", () => {
    const room = createRoom({ ...baseArgs, avatarId: "terminal" });
    expect(room.participants[0].avatarId).toBe("terminal");
  });

  it("ignora un avatarId inválido y guarda null en su lugar (no rechaza la creación)", () => {
    const room = createRoom({ ...baseArgs, avatarId: "mario" });
    expect(room.participants[0].avatarId).toBeNull();
  });

  it("usa el default de secondsPerSpeaker (60) si no se pasa", () => {
    const room = createRoom(baseArgs);
    expect(room.secondsPerSpeaker).toBe(60);
  });

  it("acepta un secondsPerSpeaker válido dentro de 30-300", () => {
    const room = createRoom({ ...baseArgs, secondsPerSpeaker: 90 });
    expect(room.secondsPerSpeaker).toBe(90);
  });

  it("rechaza un secondsPerSpeaker fuera de rango o no entero", () => {
    expect(() => createRoom({ ...baseArgs, secondsPerSpeaker: 29 })).toThrow(InvalidActionError);
    expect(() => createRoom({ ...baseArgs, secondsPerSpeaker: 301 })).toThrow(InvalidActionError);
    expect(() => createRoom({ ...baseArgs, secondsPerSpeaker: 60.5 })).toThrow(InvalidActionError);
  });

  it("arranca con speakerTimer null", () => {
    const room = createRoom(baseArgs);
    expect(room.speakerTimer).toBeNull();
  });
});

describe("resolveSecondsPerSpeaker", () => {
  it("devuelve 60 por defecto si no se pasa valor", () => {
    expect(resolveSecondsPerSpeaker(undefined)).toBe(60);
  });

  it("acepta valores dentro de 30-300", () => {
    expect(resolveSecondsPerSpeaker(30)).toBe(30);
    expect(resolveSecondsPerSpeaker(300)).toBe(300);
  });

  it("rechaza valores fuera de rango", () => {
    expect(() => resolveSecondsPerSpeaker(29)).toThrow(InvalidActionError);
    expect(() => resolveSecondsPerSpeaker(301)).toThrow(InvalidActionError);
  });
});

describe("resolveAvatarId", () => {
  it("devuelve null si el valor no está en AVATAR_IDS", () => {
    expect(resolveAvatarId(undefined)).toBeNull();
    expect(resolveAvatarId("pikachu")).toBeNull();
  });

  it("devuelve el valor tal cual si es uno de AVATAR_IDS", () => {
    for (const id of AVATAR_IDS) {
      expect(resolveAvatarId(id)).toBe(id);
    }
  });
});
