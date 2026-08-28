import { describe, it, expect } from "vitest";
import { generateActionPlanPdf, buildActionPlanFilename } from "./exportPdf.js";

function room(overrides = {}) {
  return {
    code: "RETRO-4X7B",
    participants: [
      { id: "p1", name: "Cisco", role: "host" },
      { id: "p2", name: "Ana", role: "participant" },
    ],
    cards: [],
    ...overrides,
  };
}

function actionCard(id, text, overrides = {}) {
  return { id, column: "action_plan", text, authorId: "p1", assigneeIds: [], votes: [], ...overrides };
}

describe("buildActionPlanFilename", () => {
  it("arma el nombre con el código de sala y la fecha en formato YYYY-MM-DD", () => {
    const name = buildActionPlanFilename(room(), new Date(2026, 7, 28));
    expect(name).toBe("retroretro-RETRO-4X7B-2026-08-28.pdf");
  });
});

describe("generateActionPlanPdf", () => {
  it("genera un documento de una sola página sin acciones guardadas", () => {
    const doc = generateActionPlanPdf(room());
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it("genera un documento de una sola página con pocas acciones", () => {
    const r = room({ cards: [actionCard("c1", "Escribir mejor las historias de usuario")] });
    const doc = generateActionPlanPdf(r);
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it("resuelve los nombres de los responsables a partir de assigneeIds", () => {
    const r = room({
      cards: [actionCard("c1", "Documentar el deploy", { assigneeIds: ["p1", "p2"] })],
    });
    // No lanza y produce un documento válido — la resolución de nombres se
    // ejercita indirectamente (jsPDF no expone el texto renderizado para
    // inspeccionar directamente sin parsear el PDF).
    expect(() => generateActionPlanPdf(r)).not.toThrow();
  });

  it("agrega una página nueva cuando el plan de acción no entra en una sola", () => {
    const manyCards = Array.from({ length: 40 }, (_, i) =>
      actionCard(`c${i}`, `Acción concreta número ${i} con bastante texto para ocupar varias líneas del bloque`)
    );
    const doc = generateActionPlanPdf(room({ cards: manyCards }));
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });

  it("no rompe si la sala no tiene host (participants vacío)", () => {
    const r = room({ participants: [] });
    expect(() => generateActionPlanPdf(r)).not.toThrow();
  });
});
