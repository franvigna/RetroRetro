import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { createMockSocket } from "../test/mockSocket.js";

const mockSocket = createMockSocket();
vi.mock("../socket/client.js", () => ({ socket: mockSocket }));

const { RoomProvider } = await import("../context/RoomContext.jsx");
const { JoinRoomPage } = await import("./JoinRoomPage.jsx");

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/join"]}>
      <RoomProvider>
        <JoinRoomPage />
      </RoomProvider>
    </MemoryRouter>
  );
}

function goToNameStep(code = "RETRO-AB12") {
  fireEvent.change(screen.getByLabelText("Código de sala"), { target: { value: code } });
  fireEvent.click(screen.getByText(/Siguiente/));
}

describe("JoinRoomPage — flujo en dos pasos", () => {
  beforeEach(() => {
    mockSocket.emit.mockClear();
    mockSocket.connected = true;
  });

  it("paso 1 solo pide código de sala, sin campo de nombre", () => {
    renderPage();
    expect(screen.getByLabelText("Código de sala")).toBeInTheDocument();
    expect(screen.queryByLabelText("Tu nombre")).not.toBeInTheDocument();
  });

  it("no avanza del paso 1 sin código", () => {
    renderPage();
    fireEvent.click(screen.getByText(/Siguiente/));
    expect(screen.getByText(/Ingresá el código/)).toBeInTheDocument();
    expect(screen.getByLabelText("Código de sala")).toBeInTheDocument();
  });

  it("avanza al paso 2 con código válido, mostrando el campo de nombre", () => {
    renderPage();
    goToNameStep();
    expect(screen.getByLabelText("Tu nombre")).toBeInTheDocument();
  });

  it("no emite room:join sin nombre en el paso 2", () => {
    renderPage();
    goToNameStep();
    fireEvent.click(screen.getByText(/Entrar/));
    expect(screen.getByText(/Ingresá tu nombre/)).toBeInTheDocument();
    expect(mockSocket.emit).not.toHaveBeenCalledWith("room:join", expect.anything());
  });

  it("no emite room:join si no se eligió un personaje", () => {
    renderPage();
    goToNameStep("retro-ab12");
    fireEvent.change(screen.getByLabelText("Tu nombre"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByText(/Entrar/));

    expect(screen.getByText(/Elegí un personaje para continuar/)).toBeInTheDocument();
    expect(mockSocket.emit).not.toHaveBeenCalledWith("room:join", expect.anything());
  });

  it("emite room:join con el avatarId elegido", () => {
    renderPage();
    goToNameStep("retro-ab12");
    fireEvent.change(screen.getByLabelText("Tu nombre"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByLabelText("Cisco"));
    fireEvent.click(screen.getByText(/Entrar/));

    expect(mockSocket.emit).toHaveBeenCalledWith("room:join", {
      code: "RETRO-AB12",
      name: "Ana",
      avatarId: "cisco",
    });
  });

  it("room:join_locked muestra el aviso de partida ya empezada en el paso 2", () => {
    renderPage();
    goToNameStep("retro-ab12");
    fireEvent.change(screen.getByLabelText("Tu nombre"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByLabelText("Cisco"));
    fireEvent.click(screen.getByText(/Entrar/));

    act(() => {
      mockSocket.trigger("room:join_locked", { code: "RETRO-AB12" });
    });

    expect(screen.getByText(/ya empezó/)).toBeInTheDocument();
  });

  it("permite volver del paso 2 al paso 1 con Atrás", () => {
    renderPage();
    goToNameStep();
    fireEvent.click(screen.getByText(/Atrás/));
    expect(screen.getByLabelText("Código de sala")).toBeInTheDocument();
    expect(screen.queryByLabelText("Tu nombre")).not.toBeInTheDocument();
  });
});

describe("JoinRoomPage — código precargado por link de invitación (/join/:code)", () => {
  beforeEach(() => {
    mockSocket.emit.mockClear();
    mockSocket.connected = true;
  });

  it("arranca directo en el paso 2 con el código de la URL, sin pedirlo de nuevo", () => {
    render(
      <MemoryRouter initialEntries={["/join/RETRO-AB12"]}>
        <RoomProvider>
          <Routes>
            <Route path="/join/:code" element={<JoinRoomPage />} />
          </Routes>
        </RoomProvider>
      </MemoryRouter>
    );

    expect(screen.queryByLabelText("Código de sala")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Tu nombre")).toBeInTheDocument();
  });

  it("emite room:join con el código tomado de la URL", () => {
    render(
      <MemoryRouter initialEntries={["/join/RETRO-AB12"]}>
        <RoomProvider>
          <Routes>
            <Route path="/join/:code" element={<JoinRoomPage />} />
          </Routes>
        </RoomProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Tu nombre"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByLabelText("Cisco"));
    fireEvent.click(screen.getByText(/Entrar/));

    expect(mockSocket.emit).toHaveBeenCalledWith("room:join", {
      code: "RETRO-AB12",
      name: "Ana",
      avatarId: "cisco",
      sessionToken: null,
    });
  });
});
