import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SpeakerList } from "./SpeakerList.jsx";

const participants = [
  { id: "host-1", name: "Cisco", role: "host", connected: true },
  { id: "part-1", name: "Ana", role: "participant", connected: true },
];

describe("SpeakerList", () => {
  it("resalta al participante marcado como currentSpeakerId", () => {
    render(
      <SpeakerList
        participants={participants}
        currentSpeakerId="part-1"
        isHost={false}
        onSetSpeaker={() => {}}
        onClearSpeaker={() => {}}
      />
    );
    const items = screen.getAllByText(/Cisco|Ana/).map((el) => el.closest("li"));
    const anaItem = items.find((li) => li.textContent.includes("Ana"));
    expect(anaItem).toHaveAttribute("data-speaking", "true");
  });

  it("nadie está resaltado cuando currentSpeakerId es null", () => {
    render(
      <SpeakerList
        participants={participants}
        currentSpeakerId={null}
        isHost={false}
        onSetSpeaker={() => {}}
        onClearSpeaker={() => {}}
      />
    );
    document.querySelectorAll(".speaker-item").forEach((el) => {
      expect(el).toHaveAttribute("data-speaking", "false");
    });
  });

  it("participante no ve controles (no hay botones clickeables)", () => {
    render(
      <SpeakerList
        participants={participants}
        currentSpeakerId={null}
        isHost={false}
        onSetSpeaker={() => {}}
        onClearSpeaker={() => {}}
      />
    );
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("host: click en un participante emite onSetSpeaker con su id", () => {
    const onSetSpeaker = vi.fn();
    render(
      <SpeakerList
        participants={participants}
        currentSpeakerId={null}
        isHost
        onSetSpeaker={onSetSpeaker}
        onClearSpeaker={() => {}}
      />
    );
    fireEvent.click(screen.getByText("Ana"));
    expect(onSetSpeaker).toHaveBeenCalledWith("part-1");
  });

  it("muestra el mini-timer del orador actual formateado mm:ss", () => {
    render(
      <SpeakerList
        participants={participants}
        currentSpeakerId="part-1"
        speakerTimer={{ status: "running", remainingSeconds: 45 }}
        isHost={false}
        onSetSpeaker={() => {}}
        onClearSpeaker={() => {}}
      />
    );
    expect(screen.getByText("00:45")).toBeInTheDocument();
  });

  it("no muestra ningún timer si speakerTimer es null", () => {
    render(
      <SpeakerList
        participants={participants}
        currentSpeakerId="part-1"
        speakerTimer={null}
        isHost={false}
        onSetSpeaker={() => {}}
        onClearSpeaker={() => {}}
      />
    );
    expect(screen.queryByText(/00:/)).not.toBeInTheDocument();
  });

  it("host: click en el participante ya marcado hace toggle a onClearSpeaker", () => {
    const onClearSpeaker = vi.fn();
    const onSetSpeaker = vi.fn();
    render(
      <SpeakerList
        participants={participants}
        currentSpeakerId="part-1"
        isHost
        onSetSpeaker={onSetSpeaker}
        onClearSpeaker={onClearSpeaker}
      />
    );
    fireEvent.click(screen.getByText("Ana"));
    expect(onClearSpeaker).toHaveBeenCalledOnce();
    expect(onSetSpeaker).not.toHaveBeenCalled();
  });
});
