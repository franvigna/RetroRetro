import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { createMockSocket } from "../test/mockSocket.js";

const mockSocket = createMockSocket();
vi.mock("../socket/client.js", () => ({ socket: mockSocket }));

const { RoomProvider } = await import("../context/RoomContext.jsx");
const { RoomPage } = await import("./RoomPage.jsx");

function waitingRoom(overrides = {}) {
  return {
    code: "RETRO-AB12",
    hostId: "host-1",
    phase: "waiting_room",
    phaseHistory: [],
    timer: { status: "idle", durationSeconds: 0, remainingSeconds: 0 },
    participants: [{ id: "host-1", name: "Cisco", role: "host", connected: true }],
    cards: [],
    phaseDurations: {},
    starsPerParticipant: 5,
    currentSpeakerId: null,
    createdAt: Date.now(),
    ...overrides,
  };
}

function renderWaiting(socketId, room) {
  mockSocket.id = socketId;
  render(
    <MemoryRouter initialEntries={[`/room/${room.code}`]}>
      <RoomProvider>
        <Routes>
          <Route path="/room/:code" element={<RoomPage />} />
        </Routes>
      </RoomProvider>
    </MemoryRouter>
  );
  act(() => {
    mockSocket.trigger("connect");
    mockSocket.trigger("room:joined", { participantId: socketId });
    mockSocket.trigger("room:state", { room });
  });
}

describe("WaitingRoomPage — link para invitar", () => {
  beforeEach(() => {
    mockSocket.emit.mockClear();
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("muestra el botón para copiar el link de invitación", () => {
    renderWaiting("host-1", waitingRoom());
    expect(screen.getByRole("button", { name: /Copiar link para invitar/ })).toBeInTheDocument();
  });

  it("al hacer click copia el link con el código de sala y confirma visualmente", async () => {
    renderWaiting("host-1", waitingRoom());
    fireEvent.click(screen.getByRole("button", { name: /Copiar link para invitar/ }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("/join/RETRO-AB12")
      );
    });
    expect(await screen.findByRole("button", { name: /¡Copiado!/ })).toBeInTheDocument();
  });

  it("un participante (no host) también puede ver y usar el botón de invitar", () => {
    const room = waitingRoom({
      participants: [
        { id: "host-1", name: "Cisco", role: "host", connected: true },
        { id: "part-1", name: "Ana", role: "participant", connected: true },
      ],
    });
    renderWaiting("part-1", room);
    expect(screen.getByRole("button", { name: /Copiar link para invitar/ })).toBeInTheDocument();
  });
});

describe("WaitingRoomPage — nombre de equipo opcional en el header", () => {
  beforeEach(() => {
    mockSocket.emit.mockClear();
  });

  it("muestra el nombre de equipo cuando la sala lo tiene", () => {
    renderWaiting("host-1", waitingRoom({ teamName: "Jaliscom" }));
    expect(screen.getByText("EQUIPO JALISCOM")).toBeInTheDocument();
  });

  it("no muestra nada si la sala no tiene nombre de equipo", () => {
    renderWaiting("host-1", waitingRoom({ teamName: "" }));
    expect(screen.queryByText(/^EQUIPO /)).not.toBeInTheDocument();
  });
});
