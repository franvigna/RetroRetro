import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { createMockSocket } from "../test/mockSocket.js";

const mockSocket = createMockSocket();
vi.mock("../socket/client.js", () => ({ socket: mockSocket }));

const { RoomProvider, useRoom, CONNECTION_STATUS } = await import("./RoomContext.jsx");
const { ConnectionBanner } = await import("../components/ConnectionBanner.jsx");

function Probe() {
  const { connectionStatus, room, currentParticipantId, leaveRoom, createRoom, roomClosed, clearRoomClosed } =
    useRoom();
  return (
    <>
      <ConnectionBanner status={connectionStatus} />
      <span data-testid="phase">{room?.phase ?? "sin-room"}</span>
      <span data-testid="participant-id">{currentParticipantId ?? "sin-id"}</span>
      <span data-testid="speaker-remaining">{room?.speakerTimer?.remainingSeconds ?? "sin-speaker-timer"}</span>
      <span data-testid="room-closed">{String(roomClosed)}</span>
      <button type="button" onClick={leaveRoom}>
        salir
      </button>
      <button type="button" onClick={() => createRoom({ hostName: "Cisco" })}>
        crear
      </button>
      <button type="button" onClick={clearRoomClosed}>
        limpiar-cierre
      </button>
    </>
  );
}

const STORAGE_KEY = "retroretro:identity";

function renderProbe() {
  return render(
    <RoomProvider>
      <Probe />
    </RoomProvider>
  );
}

describe("RoomContext — estados de conexión del socket (mockeado)", () => {
  beforeEach(() => {
    mockSocket.connected = false;
    mockSocket.emit.mockClear();
    sessionStorage.clear();
  });

  it("arranca en estado 'connecting' mientras el socket no conectó", () => {
    renderProbe();
    expect(screen.getByRole("status")).toHaveTextContent(/Cargando nivel/);
  });

  it("pasa a 'connected' cuando el socket dispara connect", () => {
    renderProbe();
    act(() => {
      mockSocket.trigger("connect");
    });
    // El banner de estado "connected" se oculta vía CSS (display:none) pero
    // el texto igual está presente en el DOM con el mensaje correcto.
    expect(screen.getByRole("status")).toHaveTextContent("Conectado.");
  });

  it("pasa a 'disconnected' cuando el socket dispara disconnect", () => {
    renderProbe();
    act(() => {
      mockSocket.trigger("connect");
    });
    act(() => {
      mockSocket.trigger("disconnect");
    });
    expect(screen.getByRole("status")).toHaveTextContent(/Conexión perdida/);
  });

  it("pasa a 'server_full' si connect_error trae message 'server_full', y desconecta sin reintentar", () => {
    renderProbe();
    act(() => {
      mockSocket.trigger("connect_error", { message: "server_full" });
    });
    expect(screen.getByRole("status")).toHaveTextContent(/al tope de su capacidad/);
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it("un connect_error normal (sin server_full) pasa a 'disconnected', no a 'server_full'", () => {
    renderProbe();
    act(() => {
      mockSocket.trigger("connect_error", { message: "xhr poll error" });
    });
    expect(screen.getByRole("status")).toHaveTextContent(/Conexión perdida/);
  });

  it("refleja room:state recibido sin calcular nada por su cuenta", () => {
    renderProbe();
    const fakeRoom = { code: "RETRO-AB12", phase: "welcome", cards: [], participants: [] };
    act(() => {
      mockSocket.trigger("room:state", { room: fakeRoom });
    });
    expect(screen.getByTestId("phase")).toHaveTextContent("welcome");
  });

  it("deriva currentParticipantId de room:joined, no de socket.id (puede diferir tras una reconexión)", () => {
    mockSocket.id = "socket-id-de-esta-conexion";
    renderProbe();
    act(() => {
      mockSocket.trigger("connect");
    });
    // Antes de room:joined, todavía no sabemos nuestra identidad real.
    expect(screen.getByTestId("participant-id")).toHaveTextContent("sin-id");

    act(() => {
      mockSocket.trigger("room:joined", { participantId: "participant-id-historico-reasignado" });
    });
    expect(screen.getByTestId("participant-id")).toHaveTextContent("participant-id-historico-reasignado");
  });

  it("speaker:tick actualiza room.speakerTimer.remainingSeconds sin recalcular nada más", () => {
    renderProbe();
    act(() => {
      mockSocket.trigger("room:state", {
        room: {
          code: "RETRO-AB12",
          phase: "expression_round",
          cards: [],
          participants: [],
          speakerTimer: { status: "running", remainingSeconds: 60 },
        },
      });
    });
    expect(screen.getByTestId("speaker-remaining")).toHaveTextContent("60");

    act(() => {
      mockSocket.trigger("speaker:tick", { remainingSeconds: 59 });
    });
    expect(screen.getByTestId("speaker-remaining")).toHaveTextContent("59");
  });

  it("speaker:tick no hace nada si room.speakerTimer es null", () => {
    renderProbe();
    act(() => {
      mockSocket.trigger("room:state", {
        room: { code: "RETRO-AB12", phase: "welcome", cards: [], participants: [], speakerTimer: null },
      });
    });
    act(() => {
      mockSocket.trigger("speaker:tick", { remainingSeconds: 30 });
    });
    expect(screen.getByTestId("speaker-remaining")).toHaveTextContent("sin-speaker-timer");
  });

  it("room:created guarda el sessionToken recibido en sessionStorage, nunca en `room`", () => {
    renderProbe();
    fireEvent.click(screen.getByRole("button", { name: "crear" }));
    act(() => {
      mockSocket.trigger("room:created", {
        code: "RETRO-AB12",
        room: { code: "RETRO-AB12", hostId: "host-1", phase: "waiting_room", cards: [], participants: [] },
        sessionToken: "token-del-host",
      });
    });

    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    expect(stored.sessionToken).toBe("token-del-host");
  });

  it("room:joined guarda el sessionToken recibido, y la reconexión automática siguiente lo usa", () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ code: "RETRO-AB12", name: "Ana", avatarId: null, sessionToken: null })
    );

    renderProbe();
    act(() => {
      mockSocket.trigger("connect");
      mockSocket.trigger("room:joined", { participantId: "part-1", sessionToken: "token-de-ana" });
    });

    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    expect(stored.sessionToken).toBe("token-de-ana");
  });

  it("leaveRoom emite room:leave y limpia room + currentParticipantId", () => {
    renderProbe();
    act(() => {
      mockSocket.trigger("connect");
      mockSocket.trigger("room:joined", { participantId: "part-1" });
      mockSocket.trigger("room:state", { room: { code: "RETRO-AB12", phase: "closing", cards: [], participants: [] } });
    });
    expect(screen.getByTestId("phase")).toHaveTextContent("closing");

    fireEvent.click(screen.getByRole("button", { name: "salir" }));

    expect(mockSocket.emit).toHaveBeenCalledWith("room:leave");
    expect(screen.getByTestId("phase")).toHaveTextContent("sin-room");
    expect(screen.getByTestId("participant-id")).toHaveTextContent("sin-id");
  });

  it("room:closed limpia room/currentParticipantId/identidad y marca roomClosed", () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ code: "RETRO-AB12", name: "Ana", avatarId: null, sessionToken: "token-de-ana" })
    );
    renderProbe();
    act(() => {
      mockSocket.trigger("connect");
      mockSocket.trigger("room:joined", { participantId: "part-1" });
      mockSocket.trigger("room:state", { room: { code: "RETRO-AB12", phase: "welcome", cards: [], participants: [] } });
    });
    expect(screen.getByTestId("phase")).toHaveTextContent("welcome");

    act(() => {
      mockSocket.trigger("room:closed", { code: "RETRO-AB12" });
    });

    expect(screen.getByTestId("room-closed")).toHaveTextContent("true");
    expect(screen.getByTestId("phase")).toHaveTextContent("sin-room");
    expect(screen.getByTestId("participant-id")).toHaveTextContent("sin-id");
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("clearRoomClosed vuelve roomClosed a false", () => {
    renderProbe();
    act(() => {
      mockSocket.trigger("room:closed", { code: "RETRO-AB12" });
    });
    expect(screen.getByTestId("room-closed")).toHaveTextContent("true");

    fireEvent.click(screen.getByRole("button", { name: "limpiar-cierre" }));
    expect(screen.getByTestId("room-closed")).toHaveTextContent("false");
  });
});
