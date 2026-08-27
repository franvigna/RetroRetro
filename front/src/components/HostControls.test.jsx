import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HostControls } from "./HostControls.jsx";

const noop = () => {};

describe("HostControls", () => {
  it("no renderiza nada cuando el rol es participant", () => {
    const { container } = render(
      <HostControls
        role="participant"
        timerStatus="running"
        onAdvance={noop}
        onGoBack={noop}
        onPause={noop}
        onResume={noop}
        onAddTime={noop}
        canGoBack
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza los controles cuando el rol es host", () => {
    render(
      <HostControls
        role="host"
        timerStatus="running"
        onAdvance={noop}
        onGoBack={noop}
        onPause={noop}
        onResume={noop}
        onAddTime={noop}
        canGoBack
      />
    );
    expect(screen.getByText(/Siguiente nivel/)).toBeInTheDocument();
    expect(screen.getByText(/Pausar/)).toBeInTheDocument();
    expect(screen.getByText(/\+5 min/)).toBeInTheDocument();
    expect(screen.getByText(/-5 min/)).toBeInTheDocument();
  });

  it("dispara onAddTime(-300) al clickear -5 min", () => {
    const onAddTime = vi.fn();
    render(
      <HostControls
        role="host"
        timerStatus="running"
        onAdvance={noop}
        onGoBack={noop}
        onPause={noop}
        onResume={noop}
        onAddTime={onAddTime}
        canGoBack
      />
    );
    screen.getByText(/-5 min/).click();
    expect(onAddTime).toHaveBeenCalledWith(-300);
  });

  it("oculta +5min/-5min cuando showTimeControls=false", () => {
    render(
      <HostControls
        role="host"
        timerStatus="running"
        onAdvance={noop}
        onGoBack={noop}
        onPause={noop}
        onResume={noop}
        onAddTime={noop}
        canGoBack
        showTimeControls={false}
      />
    );
    expect(screen.queryByText(/\+5 min/)).not.toBeInTheDocument();
    expect(screen.queryByText(/-5 min/)).not.toBeInTheDocument();
    // Pausar/Reanudar siguen visibles — pausan speakerTimer en expression_round.
    expect(screen.getByText(/Pausar/)).toBeInTheDocument();
  });

  it("muestra Reanudar cuando el timer está pausado", () => {
    render(
      <HostControls
        role="host"
        timerStatus="paused"
        onAdvance={noop}
        onGoBack={noop}
        onPause={noop}
        onResume={noop}
        onAddTime={noop}
        canGoBack
      />
    );
    expect(screen.getByText(/Reanudar/)).toBeInTheDocument();
  });

  it("dispara onAdvance al clickear siguiente nivel", () => {
    const onAdvance = vi.fn();
    render(
      <HostControls
        role="host"
        timerStatus="running"
        onAdvance={onAdvance}
        onGoBack={noop}
        onPause={noop}
        onResume={noop}
        onAddTime={noop}
        canGoBack
      />
    );
    screen.getByText(/Siguiente nivel/).click();
    expect(onAdvance).toHaveBeenCalledOnce();
  });
});
