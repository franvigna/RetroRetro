import { describe, it, expect } from "vitest";
import { setSpeaker, clearSpeaker, advanceSpeaker, tickSpeakerTimer } from "../src/domain/turns.js";
import { InvalidActionError } from "../src/domain/errors.js";

function makeRoom(participants, { currentSpeakerId = null, secondsPerSpeaker = 60 } = {}) {
  return { currentSpeakerId, participants, secondsPerSpeaker, speakerTimer: null };
}

describe("setSpeaker", () => {
  it("marca a un participante existente como orador actual", () => {
    const room = makeRoom([{ id: "p1" }, { id: "p2" }]);
    const result = setSpeaker(room, { participantId: "p2" });
    expect(result.currentSpeakerId).toBe("p2");
  });

  it("arranca speakerTimer running con remainingSeconds = secondsPerSpeaker", () => {
    const room = makeRoom([{ id: "p1" }], { secondsPerSpeaker: 90 });
    const result = setSpeaker(room, { participantId: "p1" });
    expect(result.speakerTimer).toEqual({ status: "running", remainingSeconds: 90 });
  });

  it("reinicia speakerTimer aunque ya haya alguien hablando (host salta a mitad de turno)", () => {
    const room = { ...makeRoom([{ id: "p1" }, { id: "p2" }]), currentSpeakerId: "p1", speakerTimer: { status: "running", remainingSeconds: 5 } };
    const result = setSpeaker(room, { participantId: "p2" });
    expect(result.currentSpeakerId).toBe("p2");
    expect(result.speakerTimer).toEqual({ status: "running", remainingSeconds: 60 });
  });

  it("rechaza un participantId que no existe en la sala", () => {
    const room = makeRoom([{ id: "p1" }]);
    expect(() => setSpeaker(room, { participantId: "fantasma" })).toThrow(InvalidActionError);
  });
});

describe("clearSpeaker", () => {
  it("resetea currentSpeakerId y speakerTimer a null", () => {
    const room = { currentSpeakerId: "p1", participants: [{ id: "p1" }], speakerTimer: { status: "running", remainingSeconds: 30 } };
    const result = clearSpeaker(room);
    expect(result.currentSpeakerId).toBeNull();
    expect(result.speakerTimer).toBeNull();
  });
});

describe("advanceSpeaker", () => {
  it("pasa al siguiente participante en el orden de la lista", () => {
    const room = makeRoom([{ id: "p1" }, { id: "p2" }, { id: "p3" }], { currentSpeakerId: "p1" });
    const result = advanceSpeaker(room);
    expect(result.currentSpeakerId).toBe("p2");
  });

  it("vuelve al primero tras el último (wraparound)", () => {
    const room = makeRoom([{ id: "p1" }, { id: "p2" }, { id: "p3" }], { currentSpeakerId: "p3" });
    const result = advanceSpeaker(room);
    expect(result.currentSpeakerId).toBe("p1");
  });

  it("si no hay orador actual, arranca por el primero", () => {
    const room = makeRoom([{ id: "p1" }, { id: "p2" }], { currentSpeakerId: null });
    const result = advanceSpeaker(room);
    expect(result.currentSpeakerId).toBe("p1");
  });

  it("con un solo participante, reinicia su propio timer sin cambiar de orador", () => {
    const room = makeRoom([{ id: "p1" }], { currentSpeakerId: "p1", secondsPerSpeaker: 45 });
    const result = advanceSpeaker(room);
    expect(result.currentSpeakerId).toBe("p1");
    expect(result.speakerTimer).toEqual({ status: "running", remainingSeconds: 45 });
  });

  it("reinicia speakerTimer al rotar", () => {
    const room = makeRoom([{ id: "p1" }, { id: "p2" }], { currentSpeakerId: "p1", secondsPerSpeaker: 30 });
    const result = advanceSpeaker(room);
    expect(result.speakerTimer).toEqual({ status: "running", remainingSeconds: 30 });
  });

  it("no hace nada si no hay participantes", () => {
    const room = makeRoom([], { currentSpeakerId: null });
    const result = advanceSpeaker(room);
    expect(result.currentSpeakerId).toBeNull();
  });
});

describe("tickSpeakerTimer", () => {
  it("resta un segundo mientras está running", () => {
    const timer = { status: "running", remainingSeconds: 10 };
    expect(tickSpeakerTimer(timer)).toEqual({ status: "running", remainingSeconds: 9 });
  });

  it("no baja de 0", () => {
    const timer = { status: "running", remainingSeconds: 0 };
    expect(tickSpeakerTimer(timer)).toEqual({ status: "running", remainingSeconds: 0 });
  });

  it("no hace nada si está paused", () => {
    const timer = { status: "paused", remainingSeconds: 10 };
    expect(tickSpeakerTimer(timer)).toEqual(timer);
  });

  it("no hace nada si es null", () => {
    expect(tickSpeakerTimer(null)).toBeNull();
  });
});
