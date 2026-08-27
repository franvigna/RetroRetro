import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StarsHeader } from "./StarsHeader.jsx";

describe("StarsHeader (HU-F08b)", () => {
  it("muestra total de íconos igual a starsPerParticipant", () => {
    render(<StarsHeader total={5} remaining={5} />);
    // 5 íconos + el <p role="status"> con el resumen textual (sr-only) aparte.
    const icons = document.querySelectorAll(".stars-header-icon");
    expect(icons).toHaveLength(5);
  });

  it("marca como usados (data-used=true) los primeros N-remaining íconos", () => {
    render(<StarsHeader total={5} remaining={2} />);
    const icons = document.querySelectorAll(".stars-header-icon");
    const used = document.querySelectorAll('.stars-header-icon[data-used="true"]');
    const available = document.querySelectorAll('.stars-header-icon[data-used="false"]');
    expect(icons).toHaveLength(5);
    expect(used).toHaveLength(3);
    expect(available).toHaveLength(2);
  });

  it("no muestra ningún ícono como usado si remaining === total", () => {
    render(<StarsHeader total={3} remaining={3} />);
    expect(document.querySelectorAll('.stars-header-icon[data-used="true"]')).toHaveLength(0);
  });

  it("expone el resumen en un texto accesible (no visual) para lectores de pantalla", () => {
    render(<StarsHeader total={4} remaining={1} />);
    expect(screen.getByRole("status")).toHaveTextContent("Te quedan 1 de 4 estrellas para repartir.");
  });
});
