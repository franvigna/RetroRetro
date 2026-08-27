import { describe, it, expect, vi } from "vitest";
import { generateRoomCode } from "../src/rooms/codeGenerator.js";

describe("generateRoomCode", () => {
  it("genera un código con el formato RETRO-XXXX", () => {
    const code = generateRoomCode(() => false);
    expect(code).toMatch(/^RETRO-[A-Z0-9]{4}$/);
  });

  it("no usa caracteres ambiguos (0, O, 1, I) en el segmento generado", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode(() => false);
      const segment = code.split("-")[1];
      expect(segment).not.toMatch(/[01OI]/);
    }
  });

  it("reintenta si el código generado ya existe", () => {
    const existsFn = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    const code = generateRoomCode(existsFn);
    expect(existsFn).toHaveBeenCalledTimes(2);
    expect(code).toMatch(/^RETRO-[A-Z0-9]{4}$/);
  });
});
