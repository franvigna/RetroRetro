import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Timer } from "./Timer.jsx";

describe("Timer", () => {
  it("renderiza remainingSeconds en formato mm:ss", () => {
    render(<Timer timer={{ status: "running", durationSeconds: 180, remainingSeconds: 125 }} />);
    expect(screen.getByText("02:05")).toBeInTheDocument();
  });

  it("renderiza 00:00 cuando el timer está finished", () => {
    render(<Timer timer={{ status: "finished", durationSeconds: 180, remainingSeconds: 0 }} />);
    expect(screen.getByText("00:00")).toBeInTheDocument();
  });

  it("no rompe si no recibe timer", () => {
    const { container } = render(<Timer timer={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
