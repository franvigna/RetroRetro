import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { createMockSocket } from "../test/mockSocket.js";

const mockSocket = createMockSocket();
vi.mock("../socket/client.js", () => ({ socket: mockSocket }));

const { RoomProvider } = await import("../context/RoomContext.jsx");
const { RoomPage } = await import("./RoomPage.jsx");

function closingRoom() {
  return {
    code: "RETRO-AB12",
    hostId: "host-1",
    phase: "closing",
    phaseHistory: [],
    timer: { status: "idle", durationSeconds: 0, remainingSeconds: 0 },
    participants: [{ id: "host-1", name: "Cisco", role: "host", connected: true }],
    cards: [
      {
        id: "c1",
        column: "action_plan",
        text: "Hacer algo",
        assigneeIds: [],
        authorId: "host-1",
        votes: [],
      },
    ],
    phaseDurations: {},
    starsPerParticipant: 3,
    currentSpeakerId: null,
    createdAt: Date.now(),
  };
}

function renderClosing({ room = closingRoom(), participantId = "host-1" } = {}) {
  mockSocket.id = participantId;
  render(
    <MemoryRouter initialEntries={["/room/RETRO-AB12"]}>
      <RoomProvider>
        <Routes>
          <Route path="/" element={<div data-testid="landing">LANDING</div>} />
          <Route path="/room/:code" element={<RoomPage />} />
        </Routes>
      </RoomProvider>
    </MemoryRouter>
  );
  act(() => {
    mockSocket.trigger("connect");
    mockSocket.trigger("room:joined", { participantId });
    mockSocket.trigger("room:state", { room });
  });
}

describe("ClosingPage — volver al inicio", () => {
  beforeEach(() => {
    mockSocket.emit.mockClear();
  });

  it("muestra el botón Volver al inicio", () => {
    renderClosing();
    expect(screen.getByRole("button", { name: /Volver al inicio/ })).toBeInTheDocument();
  });

  it("muestra el título de la tarjeta de action_plan (nuevo shape, no card.text)", () => {
    renderClosing();
    expect(screen.getByText("Hacer algo")).toBeInTheDocument();
  });

  it("al hacer click emite room:leave y navega a la Landing", () => {
    renderClosing();
    fireEvent.click(screen.getByRole("button", { name: /Volver al inicio/ }));

    expect(mockSocket.emit).toHaveBeenCalledWith("room:leave");
    expect(screen.getByTestId("landing")).toBeInTheDocument();
  });
});

describe("ClosingPage — volver a la fase anterior (host)", () => {
  beforeEach(() => {
    mockSocket.emit.mockClear();
  });

  it("el host ve el botón Nivel anterior deshabilitado si no hay historial", () => {
    renderClosing();
    expect(screen.getByRole("button", { name: /Nivel anterior/ })).toBeDisabled();
  });

  it("el host puede volver a la fase anterior si hay historial", () => {
    const room = { ...closingRoom(), phaseHistory: ["action_plan"] };
    renderClosing({ room });
    fireEvent.click(screen.getByRole("button", { name: /Nivel anterior/ }));
    expect(mockSocket.emit).toHaveBeenCalledWith("phase:go_back");
  });

  it("un participante no-host no ve el botón Nivel anterior", () => {
    const room = {
      ...closingRoom(),
      phaseHistory: ["action_plan"],
      participants: [
        { id: "host-1", name: "Cisco", role: "host", connected: true },
        { id: "p2", name: "Ana", role: "participant", connected: true },
      ],
    };
    renderClosing({ room, participantId: "p2" });
    expect(screen.queryByRole("button", { name: /Nivel anterior/ })).not.toBeInTheDocument();
  });
});

describe("ClosingPage — nombre de equipo opcional en el header", () => {
  beforeEach(() => {
    mockSocket.emit.mockClear();
  });

  it("muestra el nombre de equipo cuando la sala lo tiene", () => {
    renderClosing({ room: { ...closingRoom(), teamName: "Jaliscom" } });
    expect(screen.getByText("EQUIPO JALISCOM")).toBeInTheDocument();
  });

  it("no muestra nada si la sala no tiene nombre de equipo", () => {
    renderClosing({ room: { ...closingRoom(), teamName: "" } });
    expect(screen.queryByText(/^EQUIPO /)).not.toBeInTheDocument();
  });
});
