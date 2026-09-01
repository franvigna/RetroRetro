import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { createMockSocket } from "../test/mockSocket.js";

const mockSocket = createMockSocket();
vi.mock("../socket/client.js", () => ({ socket: mockSocket }));

const { RoomProvider } = await import("../context/RoomContext.jsx");
const { RoomPage } = await import("./RoomPage.jsx");

function baseRoom(overrides = {}) {
  return {
    code: "RETRO-AB12",
    hostId: "host-1",
    phase: "keep_improve_try",
    phaseHistory: ["waiting_room", "welcome", "previous_action"],
    timer: { status: "running", durationSeconds: 900, remainingSeconds: 800 },
    participants: [
      { id: "host-1", name: "Cisco", role: "host", connected: true },
      { id: "part-1", name: "Ana", role: "participant", connected: true },
    ],
    cards: [],
    phaseDurations: {},
    starsPerParticipant: 3,
    currentSpeakerId: null,
    createdAt: Date.now(),
    ...overrides,
  };
}

// Renderiza a través de RoomPage (como en la app real) para que
// ActivePhasePage solo se monte una vez que room:state ya llegó, en vez de
// montarlo directamente con room=null.
function renderRoom(socketId, room) {
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

describe("ActivePhasePage — bienvenida", () => {
  it("presenta las reglas como una guía visual dividida en pasos", () => {
    renderRoom("part-1", baseRoom({ phase: "welcome" }));

    expect(screen.getByRole("heading", { name: "La misión de esta partida" })).toBeInTheDocument();
    expect(screen.getByText("Compartir")).toBeInTheDocument();
    expect(screen.getByText("Escuchar")).toBeInTheDocument();
    expect(screen.getByText("Priorizar")).toBeInTheDocument();
    expect(screen.getByText("Actuar")).toBeInTheDocument();
    expect(screen.getByText("⏱ Cada nivel tiene su propio tiempo")).toBeInTheDocument();
  });
});

describe("ActivePhasePage — controles de host ocultos para participant", () => {
  beforeEach(() => {
    mockSocket.emit.mockClear();
  });

  it("no muestra controles de host cuando el rol actual es participant", () => {
    renderRoom("part-1", baseRoom());
    expect(screen.queryByText(/CONTROLES DE ANFITRIÓN/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Siguiente nivel/)).not.toBeInTheDocument();
  });

  it("muestra controles de host cuando el rol actual es host", () => {
    renderRoom("host-1", baseRoom());
    expect(screen.getByText(/CONTROLES DE ANFITRIÓN/)).toBeInTheDocument();
    expect(screen.getByText(/Siguiente nivel/)).toBeInTheDocument();
  });

  it("muestra el timer en formato mm:ss dentro del nivel activo", () => {
    renderRoom("host-1", baseRoom());
    expect(screen.getByText("13:20")).toBeInTheDocument();
  });
});

describe("ActivePhasePage — expression_round (Turno de jugador)", () => {
  beforeEach(() => {
    mockSocket.emit.mockClear();
  });

  it("host: click en un participante emite turn:set_speaker; click de nuevo emite turn:clear_speaker", () => {
    renderRoom("host-1", baseRoom({ phase: "expression_round", currentSpeakerId: null }));

    fireEvent.click(screen.getByText("Ana"));
    expect(mockSocket.emit).toHaveBeenCalledWith("turn:set_speaker", { participantId: "part-1" });

    act(() => {
      mockSocket.trigger("room:state", { room: baseRoom({ phase: "expression_round", currentSpeakerId: "part-1" }) });
    });
    fireEvent.click(screen.getByText("Ana"));
    expect(mockSocket.emit).toHaveBeenCalledWith("turn:clear_speaker");
  });

  it("participante no ve controles de host en expression_round", () => {
    renderRoom("part-1", baseRoom({ phase: "expression_round", currentSpeakerId: "part-1" }));
    expect(screen.queryByRole("button", { name: "Ana" })).not.toBeInTheDocument();
    expect(screen.queryByText(/CONTROLES DE ANFITRIÓN/)).not.toBeInTheDocument();
  });

  it("no muestra el timer de fase tradicional ni +5min/-5min durante expression_round", () => {
    renderRoom("host-1", baseRoom({ phase: "expression_round" }));
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    expect(screen.queryByText(/\+5 min/)).not.toBeInTheDocument();
    expect(screen.queryByText(/-5 min/)).not.toBeInTheDocument();
  });

  it("muestra el mini-timer del orador actual dentro de SpeakerList", () => {
    renderRoom(
      "host-1",
      baseRoom({
        phase: "expression_round",
        currentSpeakerId: "part-1",
        speakerTimer: { status: "running", remainingSeconds: 45 },
      })
    );
    expect(screen.getByText("00:45")).toBeInTheDocument();
  });

  it("muestra SpeakerRotationWarning cuando quedan 5 segundos o menos", () => {
    renderRoom(
      "host-1",
      baseRoom({
        phase: "expression_round",
        currentSpeakerId: "host-1",
        speakerTimer: { status: "running", remainingSeconds: 5 },
      })
    );
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText(/Sigue: Ana/)).toBeInTheDocument();
  });

  it("no muestra SpeakerRotationWarning con más de 5 segundos restantes", () => {
    renderRoom(
      "host-1",
      baseRoom({
        phase: "expression_round",
        currentSpeakerId: "host-1",
        speakerTimer: { status: "running", remainingSeconds: 30 },
      })
    );
    expect(screen.queryByText(/Sigue:/)).not.toBeInTheDocument();
  });

  it("muestra las tarjetas de keep_improve_try escritas por todos, sin filtrar por autor", () => {
    const room = baseRoom({
      phase: "expression_round",
      cards: [
        { id: "c1", column: "keep", text: "Card de Cisco", authorId: "host-1", votes: [] },
        { id: "c2", column: "improve", text: "Card de Ana", authorId: "part-1", votes: [] },
      ],
    });
    renderRoom("part-1", room);
    expect(screen.getByText("Card de Cisco")).toBeInTheDocument();
    expect(screen.getByText("Card de Ana")).toBeInTheDocument();
  });

  it("no muestra botón de voto (estrella) en las tarjetas durante expression_round", () => {
    const room = baseRoom({
      phase: "expression_round",
      cards: [{ id: "c1", column: "keep", text: "Card de Cisco", authorId: "host-1", votes: [] }],
    });
    renderRoom("part-1", room);
    expect(screen.queryByRole("button", { name: "Dar tu estrella a esta tarjeta" })).not.toBeInTheDocument();
  });

  it("no permite agregar tarjetas nuevas durante expression_round", () => {
    const room = baseRoom({ phase: "expression_round", cards: [] });
    renderRoom("part-1", room);
    expect(screen.queryByLabelText("Nueva tarjeta")).not.toBeInTheDocument();
  });

  it("permite editar/eliminar la propia tarjeta, no las ajenas, durante expression_round", () => {
    const room = baseRoom({
      phase: "expression_round",
      cards: [
        { id: "c1", column: "keep", text: "Card de Cisco", authorId: "host-1", votes: [] },
        { id: "c2", column: "improve", text: "Card de Ana", authorId: "part-1", votes: [] },
      ],
    });
    renderRoom("part-1", room);
    expect(screen.getByLabelText("Editar tarjeta")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Editar tarjeta")).toHaveLength(1);
  });

  it("resalta únicamente las tarjetas de la persona que está hablando", () => {
    const room = baseRoom({
      phase: "expression_round",
      currentSpeakerId: "part-1",
      cards: [
        { id: "c1", column: "keep", text: "Card del host", authorId: "host-1", votes: [] },
        { id: "c2", column: "improve", text: "Card de Ana", authorId: "part-1", votes: [] },
        { id: "c3", column: "try", text: "Otra de Ana", authorId: "part-1", votes: [] },
      ],
    });
    renderRoom("host-1", room);

    expect(screen.getByText("Card del host").closest("li")).not.toHaveAttribute("data-speaker-card");
    expect(screen.getByText("Card de Ana").closest("li")).toHaveAttribute("data-speaker-card", "true");
    expect(screen.getByText("Otra de Ana").closest("li")).toHaveAttribute("data-speaker-card", "true");
  });
});

describe("ActivePhasePage — preguntas disparadoras", () => {
  it("las muestra únicamente en el Nivel 3", () => {
    renderRoom("part-1", baseRoom({ phase: "keep_improve_try" }));
    expect(screen.getByText("¿Qué se puede mejorar?")).toBeInTheDocument();
  });

  it("las oculta en el Nivel 5 aunque muestre las columnas Keep/Improve/Try", () => {
    renderRoom("part-1", baseRoom({ phase: "grouping_voting" }));
    expect(screen.queryByText("¿Qué se puede mejorar?")).not.toBeInTheDocument();
    expect(screen.getByText("Improve (Mejorar)")).toBeInTheDocument();
  });
});

describe("ActivePhasePage — tip de edición", () => {
  it("muestra debajo de las columnas que una tarjeta se puede editar con doble click", () => {
    renderRoom("part-1", baseRoom({ phase: "keep_improve_try" }));
    expect(screen.getByRole("note")).toHaveTextContent("Podés hacer doble click en una tarjeta para editarla.");
  });

  it("no muestra el tip durante la votación, donde la edición está deshabilitada", () => {
    renderRoom("part-1", baseRoom({ phase: "grouping_voting" }));
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("no muestra el tip en el Nivel 7", () => {
    renderRoom("part-1", baseRoom({ phase: "action_plan" }));
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});

describe("ActivePhasePage — TimerFinishedBanner (fases normales)", () => {
  it("muestra el banner de alarma cuando timer.status es finished", () => {
    renderRoom(
      "host-1",
      baseRoom({ timer: { status: "finished", durationSeconds: 900, remainingSeconds: 0 } })
    );
    expect(screen.getByText(/TIEMPO CUMPLIDO/)).toBeInTheDocument();
  });

  it("host ve los botones +5min/Continuar en el banner de alarma", () => {
    renderRoom(
      "host-1",
      baseRoom({ timer: { status: "finished", durationSeconds: 900, remainingSeconds: 0 } })
    );
    expect(screen.getByRole("button", { name: /Continuar/ })).toBeInTheDocument();
  });

  it("participante no ve botones de acción en el banner de alarma", () => {
    renderRoom(
      "part-1",
      baseRoom({ timer: { status: "finished", durationSeconds: 900, remainingSeconds: 0 } })
    );
    expect(screen.getByText(/TIEMPO CUMPLIDO/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continuar/ })).not.toBeInTheDocument();
  });

  it("no muestra el banner mientras el timer sigue running", () => {
    renderRoom("host-1", baseRoom());
    expect(screen.queryByText(/TIEMPO CUMPLIDO/)).not.toBeInTheDocument();
  });
});

describe("ActivePhasePage — hall_of_fame (Salón de la Fama)", () => {
  it("muestra el top votado sin formulario de agregar tarjetas", () => {
    const room = baseRoom({
      phase: "hall_of_fame",
      cards: [
        { id: "c1", column: "keep", text: "Top card", authorId: "part-1", votes: ["host-1"] },
      ],
    });
    renderRoom("host-1", room);
    expect(screen.getByText("Top card")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nueva tarjeta")).not.toBeInTheDocument();
  });
});

describe("ActivePhasePage — previous_action (Nivel 2)", () => {
  it("muestra el texto libre cargado por el host al crear la sala", () => {
    const room = baseRoom({ phase: "previous_action", previousActionNotes: "Documentar el deploy" });
    renderRoom("host-1", room);
    expect(screen.getByText("Documentar el deploy")).toBeInTheDocument();
  });

  it("muestra un mensaje claro si el host no cargó ningún pendiente", () => {
    const room = baseRoom({ phase: "previous_action", previousActionNotes: "" });
    renderRoom("host-1", room);
    expect(screen.getByText(/no cargó ningún pendiente/)).toBeInTheDocument();
  });
});
