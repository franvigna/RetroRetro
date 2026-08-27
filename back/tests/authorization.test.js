import { describe, it, expect } from "vitest";
import { assertIsHost } from "../src/domain/authorization.js";
import { UnauthorizedError } from "../src/domain/errors.js";

describe("assertIsHost", () => {
  it("no lanza si el participantId coincide con hostId", () => {
    const room = { hostId: "host-1" };
    expect(() => assertIsHost(room, "host-1", "phase:advance")).not.toThrow();
  });

  it("rechaza si el participantId no coincide con hostId", () => {
    const room = { hostId: "host-1" };
    expect(() => assertIsHost(room, "participant-2", "phase:advance")).toThrow(UnauthorizedError);
  });
});
