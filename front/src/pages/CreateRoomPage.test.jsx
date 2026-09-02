import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { createMockSocket } from "../test/mockSocket.js";

const mockSocket = createMockSocket();
vi.mock("../socket/client.js", () => ({ socket: mockSocket }));

const { RoomProvider } = await import("../context/RoomContext.jsx");
const { CreateRoomPage } = await import("./CreateRoomPage.jsx");

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/create"]}>
      <RoomProvider>
        <CreateRoomPage />
      </RoomProvider>
    </MemoryRouter>
  );
}

function goToDurationsStep() {
  fireEvent.change(screen.getByLabelText("Tu nombre"), { target: { value: "Cisco" } });
  const avatarButton = screen.getByLabelText("Cisco");
  if (avatarButton.getAttribute("aria-pressed") !== "true") {
    fireEvent.click(avatarButton);
  }
  fireEvent.click(screen.getByText(/Siguiente/));
}

function goToStarsStep() {
  goToDurationsStep();
  fireEvent.click(screen.getByText(/Siguiente/));
}

describe("CreateRoomPage — formulario no envía vacío", () => {
  beforeEach(() => {
    mockSocket.emit.mockClear();
    mockSocket.connected = true;
  });

  it("no avanza del paso 1 sin nombre", () => {
    renderPage();
    fireEvent.click(screen.getByText(/Siguiente/));
    expect(screen.getByText(/Ingresá tu nombre/)).toBeInTheDocument();
    // Seguimos en paso 1: el input de nombre de host sigue visible.
    expect(screen.getByLabelText("Tu nombre")).toBeInTheDocument();
  });

  it("no avanza del paso 1 sin elegir un personaje", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Tu nombre"), { target: { value: "Cisco" } });
    fireEvent.click(screen.getByText(/Siguiente/));
    expect(screen.getByText(/Elegí un personaje para continuar/)).toBeInTheDocument();
    expect(screen.getByLabelText("Tu nombre")).toBeInTheDocument();
  });

  it("avanza al paso 2 (duraciones) con nombre válido", () => {
    renderPage();
    goToDurationsStep();
    expect(screen.getByText(/Duración de cada nivel/)).toBeInTheDocument();
  });

  it("avanza al paso 3 (estrellas) desde el paso de duraciones", () => {
    renderPage();
    goToStarsStep();
    expect(screen.getByText("PASO 3")).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("el slider de estrellas arranca en 5 y no permite valores fuera de 1-10", () => {
    renderPage();
    goToStarsStep();
    const slider = screen.getByRole("slider");
    expect(slider).toHaveValue("5");
    expect(slider).toHaveAttribute("min", "1");
    expect(slider).toHaveAttribute("max", "10");
  });

  it("mueve el slider y refleja el valor elegido en pantalla", () => {
    renderPage();
    goToStarsStep();
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "7" } });
    expect(slider).toHaveValue("7");
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("emite room:create con phaseDurations en segundos y starsPerParticipant, sin focusTopic", () => {
    renderPage();
    goToStarsStep();
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "5" } });
    fireEvent.click(screen.getByText(/Crear sala/));

    expect(mockSocket.emit).toHaveBeenCalledWith(
      "room:create",
      expect.objectContaining({
        hostName: "Cisco",
        starsPerParticipant: 5,
        phaseDurations: expect.objectContaining({ welcome: 180, action_plan: 900 }),
      })
    );
    const payload = mockSocket.emit.mock.calls.find((call) => call[0] === "room:create")[1];
    expect(payload).not.toHaveProperty("focusTopic");
    expect(payload.avatarId).toBe("cisco");
    expect(payload.phaseDurations).not.toHaveProperty("expression_round");
  });

  it("emite room:create con el avatarId elegido en el paso 1", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Tu nombre"), { target: { value: "Cisco" } });
    fireEvent.click(screen.getByLabelText("Cisco"));
    goToStarsStep();
    fireEvent.click(screen.getByText(/Crear sala/));

    expect(mockSocket.emit).toHaveBeenCalledWith(
      "room:create",
      expect.objectContaining({ avatarId: "cisco" })
    );
  });

  it("crea la sala con el valor por defecto de estrellas (5) si no se toca el slider", () => {
    renderPage();
    goToStarsStep();
    fireEvent.click(screen.getByText(/Crear sala/));

    expect(mockSocket.emit).toHaveBeenCalledWith(
      "room:create",
      expect.objectContaining({ starsPerParticipant: 5 })
    );
  });

  it("el paso de duraciones incluye el input de segundos por orador del Nivel 4, con default 90", () => {
    renderPage();
    goToDurationsStep();
    expect(screen.getByText(/segundos por persona/)).toBeInTheDocument();
    const speakerInput = screen.getByDisplayValue("90");
    expect(speakerInput).toHaveAttribute("min", "30");
    expect(speakerInput).toHaveAttribute("max", "300");
  });

  it("emite room:create con secondsPerSpeaker por defecto (90) si no se toca ese input", () => {
    renderPage();
    goToStarsStep();
    fireEvent.click(screen.getByText(/Crear sala/));

    expect(mockSocket.emit).toHaveBeenCalledWith(
      "room:create",
      expect.objectContaining({ secondsPerSpeaker: 90 })
    );
  });

  it("emite room:create con el secondsPerSpeaker elegido", () => {
    renderPage();
    goToDurationsStep();
    const speakerInput = screen.getByDisplayValue("90");
    fireEvent.change(speakerInput, { target: { value: "120" } });
    fireEvent.click(screen.getByText(/Siguiente/));
    fireEvent.click(screen.getByText(/Crear sala/));

    expect(mockSocket.emit).toHaveBeenCalledWith(
      "room:create",
      expect.objectContaining({ secondsPerSpeaker: 120 })
    );
  });

  it("emite room:create con previousActionNotes vacío si no se completa el textarea", () => {
    renderPage();
    goToStarsStep();
    fireEvent.click(screen.getByText(/Crear sala/));

    expect(mockSocket.emit).toHaveBeenCalledWith(
      "room:create",
      expect.objectContaining({ previousActionNotes: "" })
    );
  });

  it("emite room:create con el texto libre cargado en el paso 3 (Nivel 2)", () => {
    renderPage();
    goToStarsStep();
    fireEvent.change(screen.getByLabelText(/Plan de acción de la retro anterior/), {
      target: { value: "Documentar el proceso de deploy" },
    });
    fireEvent.click(screen.getByText(/Crear sala/));

    expect(mockSocket.emit).toHaveBeenCalledWith(
      "room:create",
      expect.objectContaining({ previousActionNotes: "Documentar el proceso de deploy" })
    );
  });

  it("emite room:create con teamName vacío si no se completa el campo", () => {
    renderPage();
    goToStarsStep();
    fireEvent.click(screen.getByText(/Crear sala/));

    expect(mockSocket.emit).toHaveBeenCalledWith(
      "room:create",
      expect.objectContaining({ teamName: "" })
    );
  });

  it("emite room:create con el nombre de equipo cargado en el paso 3", () => {
    renderPage();
    goToStarsStep();
    fireEvent.change(screen.getByLabelText(/Nombre del equipo/), {
      target: { value: "Jaliscom" },
    });
    fireEvent.click(screen.getByText(/Crear sala/));

    expect(mockSocket.emit).toHaveBeenCalledWith(
      "room:create",
      expect.objectContaining({ teamName: "Jaliscom" })
    );
  });
});
