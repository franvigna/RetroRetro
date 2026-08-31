import { describe, it, expect } from "vitest";
import {
  createRoom,
  resolveAvatarId,
  resolveSecondsPerSpeaker,
  resolvePreviousActionNotes,
  generateSessionToken,
  toPublicRoom,
  isRoomLockedForNewJoins,
  updateRoomSettings,
  AVATAR_IDS,
  PREVIOUS_ACTION_NOTES_MAX_LENGTH,
} from "../src/domain/room.js";
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
      {
        id: "socket-1",
        name: "Cisco",
        role: "host",
        connected: true,
        avatarId: null,
        sessionToken: expect.any(String),
      },
    ]);
    expect(room.cards).toEqual([]);
    expect(room.phaseHistory).toEqual([]);
  });

  it("le asigna al host un sessionToken distinto en cada sala creada", () => {
    const roomA = createRoom(baseArgs);
    const roomB = createRoom({ ...baseArgs, code: "RETRO-9Z2Q" });
    expect(roomA.participants[0].sessionToken).not.toBe(roomB.participants[0].sessionToken);
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

  it("usa el default de starsPerParticipant (5) si no se pasa", () => {
    const room = createRoom(baseArgs);
    expect(room.starsPerParticipant).toBe(5);
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
});

describe("updateRoomSettings", () => {
  const room = createRoom(baseArgs);

  it("actualiza starsPerParticipant dentro de 1-10", () => {
    const next = updateRoomSettings(room, { starsPerParticipant: 8 });
    expect(next.starsPerParticipant).toBe(8);
  });

  it("no toca el resto del estado de la sala", () => {
    const next = updateRoomSettings(room, { starsPerParticipant: 3 });
    expect(next.code).toBe(room.code);
    expect(next.cards).toBe(room.cards);
    expect(next.phaseDurations).toBe(room.phaseDurations);
  });

  it("rechaza starsPerParticipant ausente (a diferencia de createRoom, acá es obligatorio)", () => {
    expect(() => updateRoomSettings(room, {})).toThrow(InvalidActionError);
  });

  it("rechaza starsPerParticipant fuera de rango o no entero", () => {
    expect(() => updateRoomSettings(room, { starsPerParticipant: 0 })).toThrow(InvalidActionError);
    expect(() => updateRoomSettings(room, { starsPerParticipant: 11 })).toThrow(InvalidActionError);
    expect(() => updateRoomSettings(room, { starsPerParticipant: 2.5 })).toThrow(InvalidActionError);
  });

  it("guarda avatarId null si no se pasa ninguno", () => {
    const room = createRoom(baseArgs);
    expect(room.participants[0].avatarId).toBeNull();
  });

  it("guarda un avatarId válido del set fijo", () => {
    const room = createRoom({ ...baseArgs, avatarId: AVATAR_IDS[0] });
    expect(room.participants[0].avatarId).toBe(AVATAR_IDS[0]);
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

  it("guarda previousActionNotes vacío si no se pasa nada", () => {
    const room = createRoom(baseArgs);
    expect(room.previousActionNotes).toBe("");
  });

  it("guarda previousActionNotes con el texto libre pasado por el host, recortado", () => {
    const room = createRoom({ ...baseArgs, previousActionNotes: "  Documentar el deploy  " });
    expect(room.previousActionNotes).toBe("Documentar el deploy");
  });

  it("rechaza previousActionNotes que supera el máximo de caracteres", () => {
    const tooLong = "a".repeat(PREVIOUS_ACTION_NOTES_MAX_LENGTH + 1);
    expect(() => createRoom({ ...baseArgs, previousActionNotes: tooLong })).toThrow(InvalidActionError);
  });
});

describe("resolvePreviousActionNotes", () => {
  it("devuelve string vacío si no se pasa valor", () => {
    expect(resolvePreviousActionNotes(undefined)).toBe("");
    expect(resolvePreviousActionNotes(null)).toBe("");
  });

  it("recorta espacios al inicio/fin", () => {
    expect(resolvePreviousActionNotes("  hola  ")).toBe("hola");
  });

  it("acepta texto hasta el máximo de caracteres", () => {
    const exact = "a".repeat(PREVIOUS_ACTION_NOTES_MAX_LENGTH);
    expect(resolvePreviousActionNotes(exact)).toBe(exact);
  });

  it("rechaza texto que supera el máximo de caracteres", () => {
    const tooLong = "a".repeat(PREVIOUS_ACTION_NOTES_MAX_LENGTH + 1);
    expect(() => resolvePreviousActionNotes(tooLong)).toThrow(InvalidActionError);
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

describe("generateSessionToken", () => {
  it("genera un token distinto en cada llamada", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateSessionToken()));
    expect(tokens.size).toBe(20);
  });
});

describe("toPublicRoom", () => {
  it("saca el sessionToken de todos los participantes sin tocar el resto de los campos", () => {
    const room = createRoom(baseArgs);
    const publicRoom = toPublicRoom(room);

    expect(publicRoom.participants[0]).not.toHaveProperty("sessionToken");
    expect(publicRoom.participants[0]).toEqual({
      id: "socket-1",
      name: "Cisco",
      role: "host",
      connected: true,
      avatarId: null,
    });
    // El resto de la sala (fuera de participants) no se toca.
    expect(publicRoom.code).toBe(room.code);
    expect(publicRoom.phase).toBe(room.phase);
  });

  it("no muta el room original", () => {
    const room = createRoom(baseArgs);
    toPublicRoom(room);
    expect(room.participants[0]).toHaveProperty("sessionToken");
  });
});

describe("isRoomLockedForNewJoins", () => {
  it("no está bloqueada en waiting_room", () => {
    const room = createRoom(baseArgs);
    expect(isRoomLockedForNewJoins(room)).toBe(false);
  });

  it("está bloqueada en cualquier otra fase", () => {
    const room = { ...createRoom(baseArgs), phase: "keep_improve_try" };
    expect(isRoomLockedForNewJoins(room)).toBe(true);
  });
});
