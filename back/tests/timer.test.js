import { describe, it, expect } from "vitest";
import { tick, pause, resume, addTime } from "../src/domain/timer.js";
import { InvalidActionError } from "../src/domain/errors.js";

describe("tick", () => {
  it("resta un segundo mientras está running", () => {
    const timer = { status: "running", durationSeconds: 60, remainingSeconds: 30 };
    expect(tick(timer)).toEqual({ status: "running", durationSeconds: 60, remainingSeconds: 29 });
  });

  it("pasa a finished sin quedar en negativo cuando remainingSeconds llega a 0", () => {
    const timer = { status: "running", durationSeconds: 60, remainingSeconds: 1 };
    const result = tick(timer);
    expect(result.remainingSeconds).toBe(0);
    expect(result.status).toBe("finished");
  });

  it("no hace nada si el timer no está running", () => {
    const timer = { status: "paused", durationSeconds: 60, remainingSeconds: 30 };
    expect(tick(timer)).toEqual(timer);
  });
});

describe("pause / resume", () => {
  it("pausa un timer running", () => {
    const timer = { status: "running", durationSeconds: 60, remainingSeconds: 30 };
    expect(pause(timer).status).toBe("paused");
  });

  it("rechaza pausar un timer que no está running", () => {
    const timer = { status: "paused", durationSeconds: 60, remainingSeconds: 30 };
    expect(() => pause(timer)).toThrow(InvalidActionError);
  });

  it("reanuda un timer paused", () => {
    const timer = { status: "paused", durationSeconds: 60, remainingSeconds: 30 };
    expect(resume(timer).status).toBe("running");
  });

  it("rechaza reanudar un timer que no está paused", () => {
    const timer = { status: "running", durationSeconds: 60, remainingSeconds: 30 };
    expect(() => resume(timer)).toThrow(InvalidActionError);
  });
});

describe("addTime", () => {
  it("suma segundos a un timer running", () => {
    const timer = { status: "running", durationSeconds: 60, remainingSeconds: 30 };
    const result = addTime(timer, 300);
    expect(result.durationSeconds).toBe(360);
    expect(result.remainingSeconds).toBe(330);
    expect(result.status).toBe("running");
  });

  it("suma segundos a un timer paused sin reanudarlo", () => {
    const timer = { status: "paused", durationSeconds: 60, remainingSeconds: 30 };
    const result = addTime(timer, 300);
    expect(result.remainingSeconds).toBe(330);
    expect(result.status).toBe("paused");
  });

  it("rechaza sumar tiempo a un timer idle o finished", () => {
    expect(() => addTime({ status: "idle", durationSeconds: 0, remainingSeconds: 0 }, 60)).toThrow(
      InvalidActionError
    );
    expect(() =>
      addTime({ status: "finished", durationSeconds: 60, remainingSeconds: 0 }, 60)
    ).toThrow(InvalidActionError);
  });

  it("rechaza seconds igual a cero", () => {
    const timer = { status: "running", durationSeconds: 60, remainingSeconds: 30 };
    expect(() => addTime(timer, 0)).toThrow(InvalidActionError);
  });

  it("resta segundos con un valor negativo (-5 min)", () => {
    const timer = { status: "running", durationSeconds: 600, remainingSeconds: 400 };
    const result = addTime(timer, -300);
    expect(result.durationSeconds).toBe(300);
    expect(result.remainingSeconds).toBe(100);
  });

  it("clampea a 0 si restar deja el resultado en negativo, sin lanzar error", () => {
    const timer = { status: "running", durationSeconds: 60, remainingSeconds: 30 };
    const result = addTime(timer, -300);
    expect(result.durationSeconds).toBe(0);
    expect(result.remainingSeconds).toBe(0);
  });

  it("restar cuando ya está en 0 es un no-op válido, sin error", () => {
    const timer = { status: "paused", durationSeconds: 0, remainingSeconds: 0 };
    const result = addTime(timer, -60);
    expect(result.remainingSeconds).toBe(0);
    expect(result.durationSeconds).toBe(0);
  });
});
