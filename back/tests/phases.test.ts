import { describe, it, expect } from "vitest";
import { createRoom } from "../src/domain/room.js";
import { startSession, advancePhase, goBackPhase } from "../src/domain/phases.js";
import { InvalidActionError } from "../src/domain/errors.js";

function makeRoom() {
  return createRoom({
    code: "RETRO-4X7B",
    hostId: "host-1",
    hostName: "Cisco",
    now: 1000,
  });
}

describe("startSession", () => {
  it("pasa de waiting_room a welcome con timer running", () => {
    const room = startSession(makeRoom());
    expect(room.phase).toBe("welcome");
    expect(room.timer.status).toBe("running");
    expect(room.timer.durationSeconds).toBe(room.phaseDurations.welcome);
    expect(room.timer.remainingSeconds).toBe(room.phaseDurations.welcome);
  });

  it("rechaza iniciar sesión si ya no está en waiting_room", () => {
    const room = startSession(makeRoom());
    expect(() => startSession(room)).toThrow(InvalidActionError);
  });
});

describe("advancePhase", () => {
  it("avanza secuencialmente por todas las fases y llega a closing", () => {
    let room = startSession(makeRoom());
    const expectedOrder = [
      "previous_action",
      "keep_improve_try",
      "expression_round",
      "grouping_voting",
      "hall_of_fame",
      "action_plan",
      "closing",
    ];
    for (const expectedPhase of expectedOrder) {
      room = advancePhase(room);
      expect(room.phase).toBe(expectedPhase);
    }
  });

  it("closing no tiene timer (idle)", () => {
    let room = startSession(makeRoom());
    for (let i = 0; i < 7; i++) room = advancePhase(room);
    expect(room.phase).toBe("closing");
    expect(room.timer.status).toBe("idle");
  });

  it("expression_round no tiene timer de fase (idle) — usa speakerTimer en su lugar", () => {
    let room = startSession(makeRoom());
    room = advancePhase(room); // previous_action
    room = advancePhase(room); // keep_improve_try
    room = advancePhase(room); // expression_round
    expect(room.phase).toBe("expression_round");
    expect(room.timer.status).toBe("idle");
    expect(room.speakerTimer).toBeNull();
  });

  it("speakerTimer se limpia al avanzar de fase, incluso saliendo de expression_round", () => {
    let room = startSession(makeRoom());
    room = advancePhase(room); // previous_action
    room = advancePhase(room); // keep_improve_try
    room = advancePhase(room); // expression_round
    room = { ...room, currentSpeakerId: "host-1", speakerTimer: { status: "running", remainingSeconds: 30 } };
    room = advancePhase(room); // grouping_voting
    expect(room.speakerTimer).toBeNull();
  });

  it("rechaza avanzar desde la última fase", () => {
    let room = startSession(makeRoom());
    for (let i = 0; i < 7; i++) room = advancePhase(room);
    expect(() => advancePhase(room)).toThrow(InvalidActionError);
  });

  it("acumula phaseHistory correctamente", () => {
    let room = startSession(makeRoom());
    room = advancePhase(room);
    room = advancePhase(room);
    expect(room.phaseHistory).toEqual(["waiting_room", "welcome", "previous_action"]);
  });
});

describe("goBackPhase", () => {
  it("vuelve a la fase anterior y reinicia el timer a duración completa", () => {
    let room = startSession(makeRoom());
    room = advancePhase(room); // previous_action
    room = advancePhase(room); // keep_improve_try
    room = goBackPhase(room);
    expect(room.phase).toBe("previous_action");
    expect(room.timer.remainingSeconds).toBe(room.phaseDurations.previous_action);
    expect(room.timer.status).toBe("running");
  });

  it("goBackPhase también limpia speakerTimer", () => {
    let room = startSession(makeRoom());
    room = advancePhase(room); // previous_action
    room = advancePhase(room); // keep_improve_try
    room = advancePhase(room); // expression_round
    room = { ...room, currentSpeakerId: "host-1", speakerTimer: { status: "running", remainingSeconds: 30 } };
    room = goBackPhase(room); // vuelve a keep_improve_try
    expect(room.speakerTimer).toBeNull();
  });

  it("rechaza go_back desde la primera fase real (welcome, sin historial previo)", () => {
    const room = startSession(makeRoom());
    // room.phaseHistory = ["waiting_room"], así que un go_back es válido y vuelve a waiting_room.
    const back = goBackPhase(room);
    expect(back.phase).toBe("waiting_room");
    expect(() => goBackPhase(back)).toThrow(InvalidActionError);
  });
});
