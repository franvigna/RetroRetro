import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PreviousActionPanel } from "./PreviousActionPanel.jsx";

describe("PreviousActionPanel", () => {
  it("muestra el texto libre cargado por el host", () => {
    render(<PreviousActionPanel notes="Documentar el proceso de deploy" />);
    expect(screen.getByText("Documentar el proceso de deploy")).toBeInTheDocument();
  });

  it("muestra un mensaje claro si no hay notas cargadas", () => {
    render(<PreviousActionPanel notes="" />);
    expect(screen.getByText(/no cargó ningún pendiente/)).toBeInTheDocument();
  });
});
