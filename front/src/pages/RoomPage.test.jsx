import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { createMockSocket } from "../test/mockSocket.js";

const mockSocket = createMockSocket();
vi.mock("../socket/client.js", () => ({ socket: mockSocket }));

const { RoomProvider } = await import("../context/RoomContext.jsx");
const { RoomPage } = await import("./RoomPage.jsx");

const STORAGE_KEY = "retroretro:identity";

function renderRoomRoute(code) {
  render(
    <MemoryRouter initialEntries={[`/room/${code}`]}>
      <RoomProvider>
        <Routes>
          <Route path="/room/:code" element={<RoomPage />} />
        </Routes>
      </RoomProvider>
    </MemoryRouter>
  );
}

describe("RoomPage — recuperar sesión tras un refresh (HU-F13)", () => {
  beforeEach(() => {
    mockSocket.emit.mockClear();
    mockSocket.connected = false;
    sessionStorage.clear();
  });

  it("sin identidad guardada, pide el nombre manualmente (sin auto-join)", () => {
    renderRoomRoute("RETRO-AB12");
    act(() => {
      mockSocket.trigger("connect");
    });

    expect(screen.getByRole("heading", { name: "RECONECTAR" })).toBeInTheDocument();
    expect(screen.getByLabelText("Tu nombre")).toBeInTheDocument();
    expect(mockSocket.emit).not.toHaveBeenCalledWith("room:join", expect.anything());
  });

  it("con identidad guardada en sessionStorage, reintenta room:join solo y muestra 'conectando'", () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ code: "RETRO-AB12", name: "Ana", avatarId: null, sessionToken: "token-ana" })
    );

    renderRoomRoute("RETRO-AB12");
    act(() => {
      mockSocket.trigger("connect");
    });

    expect(screen.getByRole("heading", { name: "RECONECTANDO" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Tu nombre")).not.toBeInTheDocument();
    // El sessionToken guardado es lo que autentica la reconexión automática
    // (ver room:join en back/src/socket/handlers/roomHandlers.js) — sin él,
    // el servidor trataría esto como un participante nuevo.
    expect(mockSocket.emit).toHaveBeenCalledWith("room:join", {
      code: "RETRO-AB12",
      name: "Ana",
      avatarId: null,
      sessionToken: "token-ana",
    });
  });

  it("una vez que llega room:state, deja de mostrar la pantalla de reconexión", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ code: "RETRO-AB12", name: "Ana", avatarId: null }));
    mockSocket.id = "part-1";

    renderRoomRoute("RETRO-AB12");
    act(() => {
      mockSocket.trigger("connect");
      mockSocket.trigger("room:joined", { participantId: "part-1" });
      mockSocket.trigger("room:state", {
        room: {
          code: "RETRO-AB12",
          hostId: "host-1",
          phase: "waiting_room",
          phaseHistory: [],
          timer: { status: "idle", durationSeconds: 0, remainingSeconds: 0 },
          participants: [
            { id: "host-1", name: "Cisco", role: "host", connected: true },
            { id: "part-1", name: "Ana", role: "participant", connected: true },
          ],
          cards: [],
          starsPerParticipant: 5,
          currentSpeakerId: null,
          createdAt: Date.now(),
        },
      });
    });

    expect(screen.queryByRole("heading", { name: "RECONECTANDO" })).not.toBeInTheDocument();
    expect(screen.getByText("INSERTAR MONEDA")).toBeInTheDocument();
  });

  it("room:join_locked muestra 'SALA CERRADA' en vez del formulario de reconexión", () => {
    renderRoomRoute("RETRO-AB12");
    act(() => {
      mockSocket.trigger("connect");
      mockSocket.trigger("room:join_locked", { code: "RETRO-AB12" });
    });

    expect(screen.getByRole("heading", { name: "SALA CERRADA" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Tu nombre")).not.toBeInTheDocument();
  });

  it("room:join_locked corta la pantalla de reconexión cuando había una identidad guardada", () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ code: "RETRO-AB12", name: "Ana", avatarId: null, sessionToken: "token-expirado" })
    );
    renderRoomRoute("RETRO-AB12");

    act(() => {
      mockSocket.trigger("connect");
      mockSocket.trigger("room:join_locked", { code: "RETRO-AB12" });
    });

    expect(screen.getByRole("heading", { name: "SALA CERRADA" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "RECONECTANDO" })).not.toBeInTheDocument();
  });

  it("'SALA CERRADA' tiene un botón para volver al inicio", () => {
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
      mockSocket.trigger("room:join_locked", { code: "RETRO-AB12" });
    });

    fireEvent.click(screen.getByRole("button", { name: /Volver al inicio/ }));
    expect(screen.getByTestId("landing")).toBeInTheDocument();
  });

  it("'RECONECTAR' (sin identidad guardada) tiene un botón para volver al inicio", () => {
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
    });

    expect(screen.getByRole("heading", { name: "RECONECTAR" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Volver al inicio/ }));
    expect(screen.getByTestId("landing")).toBeInTheDocument();
  });

  it("si la sala guardada ya no existe, limpia la identidad y no reintenta en loop", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ code: "RETRO-DEAD", name: "Ana", avatarId: null }));

    renderRoomRoute("RETRO-DEAD");
    act(() => {
      mockSocket.trigger("connect");
      mockSocket.trigger("room:not_found", { code: "RETRO-DEAD" });
    });

    expect(screen.getByRole("heading", { name: "RECONECTAR" })).toBeInTheDocument();
    expect(screen.getByText(/no existe o ya cerró/)).toBeInTheDocument();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("room:leave limpia la identidad guardada en sessionStorage", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ code: "RETRO-AB12", name: "Ana", avatarId: null }));
    mockSocket.id = "part-1";

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
      mockSocket.trigger("room:joined", { participantId: "part-1" });
      mockSocket.trigger("room:state", {
        room: {
          code: "RETRO-AB12",
          hostId: "host-1",
          phase: "closing",
          phaseHistory: ["action_plan"],
          timer: { status: "idle", durationSeconds: 0, remainingSeconds: 0 },
          participants: [{ id: "part-1", name: "Ana", role: "participant", connected: true }],
          cards: [],
          starsPerParticipant: 5,
          currentSpeakerId: null,
          createdAt: Date.now(),
        },
      });
    });

    fireEvent.click(screen.getByRole("button", { name: /Volver al inicio/ }));
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
