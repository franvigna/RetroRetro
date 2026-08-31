import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RoomSettingsPanel } from "./RoomSettingsPanel.jsx";

const baseRoom = {
  code: "RETRO-4X7B",
  starsPerParticipant: 5,
  secondsPerSpeaker: 60,
  phaseDurations: {
    welcome: 180,
    previous_action: 300,
    keep_improve_try: 900,
    grouping_voting: 600,
    hall_of_fame: 600,
    action_plan: 900,
  },
};

const noop = () => {};

describe("RoomSettingsPanel", () => {
  it("muestra el código de sala y las duraciones configuradas de solo lectura", () => {
    render(<RoomSettingsPanel room={baseRoom} onUpdateSettings={noop} onCloseRoom={noop} onDismiss={noop} />);
    expect(screen.getByText("RETRO-4X7B")).toBeInTheDocument();
    expect(screen.getByText(/60 segundos por persona/)).toBeInTheDocument();
  });

  it("no muestra el botón de guardar estrellas si no se cambió el valor", () => {
    render(<RoomSettingsPanel room={baseRoom} onUpdateSettings={noop} onCloseRoom={noop} onDismiss={noop} />);
    expect(screen.queryByText(/Guardar cambio de estrellas/)).not.toBeInTheDocument();
  });

  it("muestra el botón de guardar y dispara onUpdateSettings con el nuevo valor de estrellas", () => {
    const onUpdateSettings = vi.fn();
    render(
      <RoomSettingsPanel room={baseRoom} onUpdateSettings={onUpdateSettings} onCloseRoom={noop} onDismiss={noop} />
    );

    const slider = screen.getByLabelText("Estrellas de puntaje por participante");
    fireEvent.change(slider, { target: { value: "3" } });

    fireEvent.click(screen.getByText(/Guardar cambio de estrellas/));
    expect(onUpdateSettings).toHaveBeenCalledWith(3);
  });

  it("pide confirmación antes de finalizar la sala, y solo llama a onCloseRoom tras confirmar", () => {
    const onCloseRoom = vi.fn();
    render(<RoomSettingsPanel room={baseRoom} onUpdateSettings={noop} onCloseRoom={onCloseRoom} onDismiss={noop} />);

    fireEvent.click(screen.getByText("Finalizar sala"));
    expect(onCloseRoom).not.toHaveBeenCalled();
    expect(screen.getByText(/cierra la sala para todo el equipo/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Sí, finalizar sala"));
    expect(onCloseRoom).toHaveBeenCalledOnce();
  });

  it("cancelar la confirmación vuelve al botón inicial sin llamar a onCloseRoom", () => {
    const onCloseRoom = vi.fn();
    render(<RoomSettingsPanel room={baseRoom} onUpdateSettings={noop} onCloseRoom={onCloseRoom} onDismiss={noop} />);

    fireEvent.click(screen.getByText("Finalizar sala"));
    fireEvent.click(screen.getByText("Cancelar"));

    expect(onCloseRoom).not.toHaveBeenCalled();
    expect(screen.getByText("Finalizar sala")).toBeInTheDocument();
  });

  it("dispara onDismiss al cerrar el panel", () => {
    const onDismiss = vi.fn();
    render(<RoomSettingsPanel room={baseRoom} onUpdateSettings={noop} onCloseRoom={noop} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByLabelText("Cerrar"));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
