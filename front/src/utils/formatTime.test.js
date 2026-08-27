import { describe, it, expect } from "vitest";
import { formatTime } from "./formatTime.js";

describe("formatTime", () => {
  it("formatea 0 segundos como 00:00", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("formatea segundos menores a un minuto", () => {
    expect(formatTime(45)).toBe("00:45");
  });

  it("formatea minutos exactos", () => {
    expect(formatTime(180)).toBe("03:00");
  });

  it("formatea minutos y segundos combinados", () => {
    expect(formatTime(605)).toBe("10:05");
  });

  it("trata valores negativos o no numéricos como 0", () => {
    expect(formatTime(-5)).toBe("00:00");
    expect(formatTime(undefined)).toBe("00:00");
    expect(formatTime(NaN)).toBe("00:00");
  });
});
