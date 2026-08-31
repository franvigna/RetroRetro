import { describe, it, expect } from "vitest";
import { previousActionLineCount, setPreviousActionItem } from "../src/domain/previousAction.js";
import { InvalidActionError } from "../src/domain/errors.js";

describe("previousActionLineCount", () => {
  it("cuenta solo las líneas no vacías", () => {
    expect(previousActionLineCount("uno\n\ndos\n   \ntres")).toBe(3);
  });

  it("devuelve 0 para texto vacío", () => {
    expect(previousActionLineCount("")).toBe(0);
  });
});

describe("setPreviousActionItem", () => {
  const room = { previousActionNotes: "uno\ndos\ntres", previousActionChecks: {} };

  it("marca un ítem como cumplido", () => {
    const next = setPreviousActionItem(room, { index: 1, done: true });
    expect(next.previousActionChecks).toEqual({ 1: true });
  });

  it("marca un ítem como no cumplido", () => {
    const withCheck = { ...room, previousActionChecks: { 1: true } };
    const next = setPreviousActionItem(withCheck, { index: 1, done: false });
    expect(next.previousActionChecks).toEqual({ 1: false });
  });

  it("marcar dos veces el mismo valor no cambia nada (no es un toggle)", () => {
    const withCheck = { ...room, previousActionChecks: { 1: true } };
    const next = setPreviousActionItem(withCheck, { index: 1, done: true });
    expect(next.previousActionChecks).toEqual({ 1: true });
  });

  it("no toca los demás índices", () => {
    const withChecks = { ...room, previousActionChecks: { 0: true } };
    const next = setPreviousActionItem(withChecks, { index: 2, done: true });
    expect(next.previousActionChecks).toEqual({ 0: true, 2: true });
  });

  it("rechaza un índice fuera de rango", () => {
    expect(() => setPreviousActionItem(room, { index: 3, done: true })).toThrow(InvalidActionError);
    expect(() => setPreviousActionItem(room, { index: -1, done: true })).toThrow(InvalidActionError);
  });

  it("rechaza un índice no entero", () => {
    expect(() => setPreviousActionItem(room, { index: 1.5, done: true })).toThrow(InvalidActionError);
    expect(() => setPreviousActionItem(room, { index: undefined, done: true })).toThrow(InvalidActionError);
  });

  it("rechaza done ausente o no booleano", () => {
    expect(() => setPreviousActionItem(room, { index: 1 })).toThrow(InvalidActionError);
    expect(() => setPreviousActionItem(room, { index: 1, done: "true" })).toThrow(InvalidActionError);
  });
});
