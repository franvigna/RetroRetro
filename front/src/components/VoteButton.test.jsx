import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VoteButton } from "./VoteButton.jsx";

describe("VoteButton", () => {
  it("muestra estado sin votar cuando voted=false, sin texto visible, con aria-label descriptivo", () => {
    render(<VoteButton voted={false} remainingVotes={3} onVote={() => {}} />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-voted", "false");
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(btn).toHaveAccessibleName(/Dar tu estrella/);
    expect(btn.textContent.trim()).not.toMatch(/Dar estrella/);
  });

  it("muestra estado votado (toggle visual) cuando voted=true, sin texto visible", () => {
    render(<VoteButton voted={true} remainingVotes={1} onVote={() => {}} />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-voted", "true");
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(btn).toHaveAccessibleName(/Quitar tu estrella/);
    expect(btn.textContent.trim()).not.toMatch(/Tu estrella/);
  });

  it("se deshabilita si no quedan estrellas y no está votado", () => {
    render(<VoteButton voted={false} remainingVotes={0} onVote={() => {}} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("permite quitar el voto (toggle) aunque no queden estrellas", () => {
    render(<VoteButton voted={true} remainingVotes={0} onVote={() => {}} />);
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("dispara onVote con el elemento del botón al clickear", () => {
    const onVote = vi.fn();
    render(<VoteButton voted={false} remainingVotes={3} onVote={onVote} />);
    const btn = screen.getByRole("button");
    btn.click();
    expect(onVote).toHaveBeenCalledOnce();
    expect(onVote).toHaveBeenCalledWith(btn);
  });
});
